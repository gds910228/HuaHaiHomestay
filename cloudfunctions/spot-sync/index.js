/**
 * spot-sync 云函数入口
 *
 * event.type 分发:
 *  - syncSeedOnly       : 仅 upsert 18 条 seed,跳过 AMap/QWeather (KEY 缺失时也能跑)
 *  - syncWeather        : 给已有 spot 刷新天气 now + 3d
 *  - syncWalkingTimes   : 给已有 spot 刷新从民宿出发的步行时长
 *  - syncAll            : seed → AMap 增补 → 天气 → 步行,全量(推荐 cron 凌晨 6 点)
 *
 * 调用示例(开发者工具云函数测试):
 *   { "type": "syncSeedOnly" }
 *   { "type": "syncAll" }
 *
 * 返回:{ success, data:{stats:{...}}, errMsg? }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const SEED_SPOTS = require('./lib/seed-spots');
const amap = require('./lib/amap');
const qweather = require('./lib/qweather');
const syncer = require('./lib/syncer');

const db = cloud.database();

// 画海民宿坐标(用于步行距离计算的固定起点);可在环境变量 HOSTEL_LOCATION 覆盖
const HOSTEL = (() => {
  const raw = process.env.HOSTEL_LOCATION;
  if (raw) {
    const [lat, lng] = raw.split(',').map(Number);
    if (isFinite(lat) && isFinite(lng)) return { lat, lng };
  }
  // 默认:后宅镇大致中心
  return { lat: 23.4221, lng: 116.9799 };
})();

exports.main = async (event, context) => {
  // 定时触发器:event = { Type:'Timer', Message:'<trigger name>', Time:'...' }
  // 手动调用:event = { type:'syncXxx', ... }
  let type;
  if (event && event.Type === 'Timer') {
    const triggerName = event.Message || '';
    if (triggerName === 'spotWeather4h') type = 'syncWeather';
    else if (triggerName === 'spotFullDaily') type = 'syncAll';
    else type = 'syncSeedOnly'; // 兜底
    console.log(`[spot-sync] timer trigger=${triggerName} → type=${type}`);
  } else {
    type = (event && event.type) || 'syncSeedOnly';
    console.log(`[spot-sync] manual call → type=${type}`);
  }

  try {
    let result;
    switch (type) {
      case 'syncSeedOnly':
        result = await syncSeedOnly();
        break;
      case 'syncAll':
        result = await syncAll();
        break;
      case 'syncWeather':
        result = await syncWeather();
        break;
      case 'syncWalkingTimes':
        result = await syncWalkingTimes();
        break;
      case 'inspect':
        result = await inspect(event);
        break;
      default:
        return { success: false, errMsg: `Unknown type: ${type}` };
    }
    return { success: true, data: result };
  } catch (err) {
    console.error('[spot-sync] error:', err);
    return { success: false, errMsg: err.message, stack: err.stack };
  }
};

/** 仅写入 seed 景点 */
async function syncSeedOnly() {
  const stats = { inserted: 0, updated: 0, failed: 0 };
  for (const spot of SEED_SPOTS) {
    try {
      const r = await syncer.upsertSpot(spot, 'seed');
      stats[r.op === 'insert' ? 'inserted' : 'updated']++;
    } catch (err) {
      console.warn('[seed] upsert failed:', spot.amapId, err.message);
      stats.failed++;
    }
  }
  return { stats, total: SEED_SPOTS.length };
}

/** 给数据库里所有 spot 刷新天气 */
async function syncWeather() {
  if (!process.env.QWEATHER_KEY) {
    return { skipped: true, reason: 'QWEATHER_KEY 未配置' };
  }
  const spots = await fetchAllSpots();
  const stats = { ok: 0, failed: 0, total: spots.length };
  for (const spot of spots) {
    const { latitude, longitude } = spot.location || {};
    if (!latitude || !longitude) { stats.failed++; continue; }
    const now = await qweather.getNow(longitude, latitude);
    const forecast = await qweather.get7d(longitude, latitude);
    if (now || forecast.length) {
      await db.collection('guides').doc(spot._id).update({
        data: {
          weather: { now, forecast3d: forecast, updatedAt: new Date().toISOString() },
          syncedAt: new Date()
        }
      });
      stats.ok++;
    } else {
      stats.failed++;
    }
  }
  return { stats };
}

/** 给所有 spot 刷新"从画海出发"的步行距离 */
async function syncWalkingTimes() {
  if (!process.env.AMAP_KEY) {
    return { skipped: true, reason: 'AMAP_KEY 未配置' };
  }
  const spots = await fetchAllSpots();
  const stats = { ok: 0, failed: 0, total: spots.length };
  for (const spot of spots) {
    const { latitude, longitude } = spot.location || {};
    if (!latitude || !longitude) { stats.failed++; continue; }
    const walk = await amap.walkingDirection(
      { lng: HOSTEL.lng, lat: HOSTEL.lat },
      { lng: longitude, lat: latitude }
    );
    if (walk) {
      await db.collection('guides').doc(spot._id).update({
        data: {
          walkingFromHostel: { ...walk, updatedAt: new Date().toISOString() },
          syncedAt: new Date()
        }
      });
      stats.ok++;
    } else {
      stats.failed++;
    }
  }
  return { stats };
}

/** 全量同步:seed + amap 补 + weather + walking */
async function syncAll() {
  const result = {
    seed: await syncSeedOnly(),
    amap: { skipped: true },
    weather: { skipped: true },
    walking: { skipped: true }
  };

  // 1. AMap POI 增补:补 seed 之外的景点
  if (process.env.AMAP_KEY) {
    try {
      const pois = await amap.searchPOI({
        keywords: '南澳岛景点',
        types: '风景名胜',
        region: '440515',
        pageSize: 25,
        maxPages: 3
      });
      const stats = { inserted: 0, updated: 0, failed: 0, total: pois.length };
      for (const poi of pois) {
        const spot = syncer.normalizeAmapPOI(poi);
        if (!spot) { stats.failed++; continue; }
        try {
          const r = await syncer.upsertSpot(spot, 'amap');
          stats[r.op === 'insert' ? 'inserted' : 'updated']++;
        } catch (err) {
          console.warn('[amap] upsert failed:', spot.amapId, err.message);
          stats.failed++;
        }
      }
      result.amap = { stats };
    } catch (err) {
      result.amap = { error: err.message };
    }
  }

  // 2. 天气刷新
  if (process.env.QWEATHER_KEY) {
    result.weather = await syncWeather();
  }

  // 3. 步行距离刷新
  if (process.env.AMAP_KEY) {
    result.walking = await syncWalkingTimes();
  }

  return result;
}

/** 拉取数据库所有 spot,自动翻页(单次 limit 100) */
async function fetchAllSpots() {
  const all = [];
  let offset = 0;
  while (offset < 1000) {
    const res = await db.collection('guides')
      .where({ category: 'spot' })
      .field({ _id: true, location: true, title: true, amapId: true })
      .skip(offset)
      .limit(100)
      .get();
    if (!res.data || res.data.length === 0) break;
    all.push(...res.data);
    if (res.data.length < 100) break;
    offset += 100;
  }
  return all;
}

/**
 * 诊断接口:返回一条 spot 的完整原始数据,用于排查 geoLocation 字段是否真的写入
 * 调用:{"type":"inspect"} 或 {"type":"inspect","amapId":"seed:qingaowan"}
 */
async function inspect(event) {
  const where = { category: 'spot' };
  if (event.amapId) where.amapId = event.amapId;

  const res = await db.collection('guides').where(where).limit(1).get();
  const doc = res.data[0];
  if (!doc) return { found: false, message: '未找到 spot 记录,请先跑 syncSeedOnly' };

  // 同时返回字段列表 + geoLocation 的精确类型,排查序列化问题
  const fieldNames = Object.keys(doc).sort();
  const geoInfo = {
    hasGeoLocation: 'geoLocation' in doc,
    geoLocationValue: doc.geoLocation,
    geoLocationType: typeof doc.geoLocation,
    geoLocationKeys: doc.geoLocation ? Object.keys(doc.geoLocation) : null
  };

  // 顺便测一下当前 SDK 的 db.Geo.Point() 现造一个对比
  let liveTest;
  try {
    const p = db.Geo.Point(117.131, 23.4566);
    liveTest = {
      value: p,
      type: typeof p,
      keys: p ? Object.keys(p) : null
    };
  } catch (err) {
    liveTest = { error: err.message };
  }

  return {
    found: true,
    fieldNames,
    geoInfo,
    liveGeoPointTest: liveTest,
    fullDoc: doc
  };
}
