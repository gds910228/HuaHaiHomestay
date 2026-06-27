/**
 * 路线 upsert + 规划核心
 *
 * upsertRoute(route): 按 routeKey upsert 到 guides 集合(category='route')
 * planRoute(routeDoc): 读 waypoints → 按 dayIndex 分组 → 调 AMap direction → 拼 polylineSegments
 *
 * 失败处理矩阵:
 *  - waypoints < 2     : 抛错,由 index.js 转为 {success:false}
 *  - AMAP_KEY 未配置   : 全部段落 fallback 直线,routePlanStatus='fallback-straight'
 *  - 单段超时/失败     : 该段 fallback 直线,routePlanStatus='partial'
 *  - AMap 10003 超额   : 自此往后全部 fallback,routePlanStatus='partial'
 */
const cloud = require('wx-server-sdk');
const amap = require('./amap-direction');

const db = cloud.database();

/**
 * 按 routeKey upsert 一条路线
 * @param {Object} route  必含 routeKey, title, waypoints[]
 * @param {string} source 'seed' | 'admin'
 */
async function upsertRoute(route, source = 'seed') {
  if (!route.routeKey) throw new Error('upsertRoute 缺少 routeKey');
  if (!Array.isArray(route.waypoints) || route.waypoints.length < 2) {
    throw new Error(`upsertRoute ${route.routeKey} waypoints 至少 2 个`);
  }

  const now = new Date();
  const data = {
    routeKey: route.routeKey,
    title: route.title,
    summary: route.summary || '',
    address: route.address || '南澳岛',
    category: 'route',
    tags: Array.isArray(route.tags) ? route.tags : [],
    images: Array.isArray(route.images) ? route.images : [],
    days: Number(route.days) || 1,
    transport: route.transport || 'driving',
    waypoints: route.waypoints.map(normalizeWaypoint),
    source,
    syncedAt: now,
    updateTime: now
  };
  if (route.dayTransport) data.dayTransport = route.dayTransport;
  if (route.cover) data.cover = route.cover;
  if (typeof route.weight === 'number') data.weight = route.weight;

  const existRes = await db.collection('guides').where({ routeKey: route.routeKey }).limit(1).get();
  if (existRes.data && existRes.data.length > 0) {
    const id = existRes.data[0]._id;
    await db.collection('guides').doc(id).update({ data });
    return { _id: id, op: 'update' };
  } else {
    const createData = {
      ...data,
      status: 'published',
      views: 0,
      likes: 0,
      weight: typeof data.weight === 'number' ? data.weight : 50,
      createTime: now
    };
    const addRes = await db.collection('guides').add({ data: createData });
    return { _id: addRes._id, op: 'insert' };
  }
}

function normalizeWaypoint(wp) {
  return {
    name: String(wp.name || '').trim(),
    latitude: Number(wp.latitude),
    longitude: Number(wp.longitude),
    dayIndex: Number(wp.dayIndex) || 1,
    stayMin: Number(wp.stayMin) || 0,
    desc: String(wp.desc || ''),
    tip: String(wp.tip || '')
  };
}

/**
 * 给一条已存在的路线做 polyline 规划,把结果直接写回库
 * @param {Object} routeDoc  从 guides 集合 doc().get() 返回的对象
 * @returns {Promise<{segments:number, fallbackCount:number, totalDistance:number, totalDuration:number, status:string}>}
 */
async function planRoute(routeDoc) {
  const wps = (routeDoc.waypoints || []).filter(w =>
    isFinite(Number(w.latitude)) && isFinite(Number(w.longitude))
  );
  if (wps.length < 2) {
    throw new Error('waypoints < 2,无法规划');
  }

  const transport = routeDoc.transport || 'driving';
  const dayTransport = routeDoc.dayTransport || {};

  // 按 dayIndex 分组,保持原数组下标,以便 fromIdx/toIdx 还原原始位置
  const indexedWps = wps.map((w, i) => ({ ...w, _idx: i, dayIndex: Number(w.dayIndex) || 1 }));
  const byDay = {};
  for (const w of indexedWps) {
    if (!byDay[w.dayIndex]) byDay[w.dayIndex] = [];
    byDay[w.dayIndex].push(w);
  }

  const segments = [];
  let totalDistance = 0;
  let totalDuration = 0;
  let fallbackCount = 0;
  let amapQuotaExceeded = false;
  let amapKeyMissing = !process.env.AMAP_KEY;

  for (const dayKey of Object.keys(byDay).sort((a, b) => Number(a) - Number(b))) {
    const dayWps = byDay[dayKey];
    if (dayWps.length < 2) continue; // 单点 day 没有段

    const mode = resolveMode(transport, dayTransport, dayKey);

    for (let i = 0; i < dayWps.length - 1; i++) {
      const from = dayWps[i];
      const to = dayWps[i + 1];
      const origin = { lng: from.longitude, lat: from.latitude };
      const destination = { lng: to.longitude, lat: to.latitude };

      let seg;
      if (amapKeyMissing || amapQuotaExceeded) {
        seg = makeStraightSegment(from, to, mode);
        fallbackCount++;
      } else {
        try {
          const fn = mode === 'walking' ? amap.walking : amap.driving;
          const r = await fn(origin, destination);
          seg = {
            dayIndex: Number(dayKey),
            mode,
            fromIdx: from._idx,
            toIdx: to._idx,
            points: r.points && r.points.length >= 2
              ? r.points
              : [[origin.lng, origin.lat], [destination.lng, destination.lat]],
            distance: r.distance,
            duration: r.duration
          };
          totalDistance += r.distance || 0;
          totalDuration += r.duration || 0;
        } catch (err) {
          console.warn(`[plan] ${routeDoc.routeKey} 段 ${from._idx}->${to._idx} 失败:`, err.message);
          if (err.amapCode === '10003' || /quota|超限/i.test(err.message || '')) {
            amapQuotaExceeded = true;
          }
          seg = makeStraightSegment(from, to, mode);
          fallbackCount++;
        }
      }
      segments.push(seg);
    }
  }

  // 状态判定:全部 fallback → fallback-straight;有部分成功 → partial 或 ok
  let status;
  if (segments.length === 0) {
    status = 'failed';
  } else if (fallbackCount === segments.length) {
    status = 'fallback-straight';
  } else if (fallbackCount > 0) {
    status = 'partial';
  } else {
    status = 'ok';
  }

  // 直线段也累加进 totalDistance(用 haversine 估算)和 duration(-1 表示未知)
  if (status === 'fallback-straight' || status === 'partial') {
    for (const seg of segments) {
      if (seg.duration === -1) {
        totalDistance += seg.distance || 0;
        // 直线段 duration 留 -1,不累加到 totalDuration
      }
    }
  }

  const update = {
    polylineSegments: segments,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration),
    routePlanStatus: status,
    routePlanAt: new Date()
  };
  if (amapKeyMissing) update.routePlanError = 'AMAP_KEY 未配置,使用直线兜底';
  else if (amapQuotaExceeded) update.routePlanError = 'AMap 配额超限,部分段已 fallback';
  else update.routePlanError = '';

  await db.collection('guides').doc(routeDoc._id).update({ data: update });

  return {
    segments: segments.length,
    fallbackCount,
    totalDistance: update.totalDistance,
    totalDuration: update.totalDuration,
    status
  };
}

/** 决定本段用哪种交通方式 */
function resolveMode(transport, dayTransport, dayKey) {
  if (transport === 'driving' || transport === 'walking') return transport;
  // mixed: 优先 dayTransport,缺省按 dayKey 兜底(1=driving, 2+=walking)
  const m = dayTransport[String(dayKey)];
  if (m === 'driving' || m === 'walking') return m;
  return Number(dayKey) === 1 ? 'driving' : 'walking';
}

/** 直线兜底段,duration=-1 标记未知 */
function makeStraightSegment(from, to, mode) {
  const distKm = haversineKm(from.latitude, from.longitude, to.latitude, to.longitude);
  return {
    dayIndex: from.dayIndex,
    mode,
    fromIdx: from._idx,
    toIdx: to._idx,
    points: [[from.longitude, from.latitude], [to.longitude, to.latitude]],
    distance: Math.round(distKm * 1000),
    duration: -1,
    fallback: true
  };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { upsertRoute, planRoute };
