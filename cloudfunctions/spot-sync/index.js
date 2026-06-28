/**
 * spot-sync 云函数入口
 *
 * event.type 分发:
 *  - syncSeedOnly         : 仅 upsert 18 条 seed,跳过 AMap/QWeather (KEY 缺失时也能跑)
 *  - syncWeather          : 给已有 spot 刷新天气 now + 3d
 *  - syncWalkingTimes     : 给已有 spot 刷新从民宿出发的步行时长
 *  - syncAll              : seed → AMap 增补 → 天气 → 步行,全量(推荐 cron 凌晨 6 点)
 *  - refineSpots          : 用 AMap 文本搜索按 title 校准 spot 坐标 + 地址 + 图片
 *  - refineFoodLocations  : 用 AMap 文本搜索按 title/address 校准 food 坐标 + 地址
 *  - assignDistrictLocations : 给 food 按 address 关键字自动分配镇中心坐标(AMap 没收录的小店兜底)
 *  - inspect              : 诊断接口,返回单条 spot 完整字段(排查序列化问题)
 *
 * 调用示例(开发者工具云函数测试):
 *   { "type": "syncSeedOnly" }
 *   { "type": "syncAll" }
 *   { "type": "refineSpots" }
 *   { "type": "refineFoodLocations" }
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

// 南澳县 adcode,用于限定 AMap POI 搜索范围
const NANAO_REGION = '440515';

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
      case 'refineSpots':
        result = await refineSpots(event);
        break;
      case 'refineFoodLocations':
        result = await refineFoodLocations(event);
        break;
      case 'assignDistrictLocations':
        result = await assignDistrictLocations(event);
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
    // forecast 现在是 { forecast7d, forecast3d } 双字段(qweather.js 改造后)
    const f7 = forecast.forecast7d || [];
    const f3 = forecast.forecast3d || [];
    if (now || f7.length) {
      await db.collection('guides').doc(spot._id).update({
        data: {
          weather: {
            now,
            forecast3d: f3,    // 向后兼容旧消费者(spot 页 / route-detail 等)
            forecast7d: f7,    // info-board 仪表盘消费完整 7 天
            updatedAt: new Date().toISOString()
          },
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
        region: NANAO_REGION,
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

/**
 * 校准景点坐标 + 地址 + 图片
 * 用 AMap 文本搜索每个 spot 的 title,匹配置信度高时更新 location/address/images
 *
 * @param {Object} event
 * @param {boolean} [event.dryRun=false]  仅返回 diff,不写库
 * @param {string}  [event.amapId]         仅校准指定一条
 * @param {number}  [event.limit=5]        本次最多处理多少条(防超时,默认每批 5 条)
 * @param {number}  [event.offset=0]       从第几条开始(配合 limit 分批)
 */
async function refineSpots(event) {
  if (!process.env.AMAP_KEY) {
    return { skipped: true, reason: 'AMAP_KEY 未配置' };
  }
  const dryRun = !!(event && event.dryRun);
  const onlyId = event && event.amapId;
  const limit = Math.max(1, Math.min(50, (event && event.limit) || 5));
  const offset = Math.max(0, (event && event.offset) || 0);

  const where = { category: 'spot' };
  if (onlyId) where.amapId = onlyId;
  const allFull = await fetchAll(where);
  const all = onlyId ? allFull : allFull.slice(offset, offset + limit);

  const stats = {
    matched: 0,
    updated: 0,
    lowConfidence: 0,
    failed: 0,
    total: all.length,
    grandTotal: allFull.length,
    offset,
    nextOffset: offset + all.length < allFull.length ? offset + all.length : null
  };
  const diffs = [];

  for (const spot of all) {
    try {
      // 用核心关键词搜索(去掉 ·后缀、风景区/森林公园等通用尾缀)
      const keyword = extractSearchKeyword(spot.title);
      const pois = await amap.searchPOI({
        keywords: keyword,
        region: NANAO_REGION,
        pageSize: 5,
        maxPages: 1
      });
      // 带距离哨兵的匹配,避免被同名连锁店带跑(南澳岛全岛距离 ~18km,留 15km 容忍)
      const best = pickBestMatch(spot.title, pois, spot.location, { maxDriftKm: 15 });
      if (!best) {
        stats.lowConfidence++;
        diffs.push({
          title: spot.title,
          searchKeyword: keyword,
          action: 'no-match',
          candidates: (pois || []).map(p => ({ name: p.name, loc: p.location, addr: p.address }))
        });
        continue;
      }
      stats.matched++;

      const [lngStr, latStr] = (best.location || '').split(',');
      const newLng = Number(lngStr);
      const newLat = Number(latStr);
      if (!isFinite(newLng) || !isFinite(newLat)) {
        stats.failed++;
        continue;
      }

      const oldLoc = spot.location || {};
      const drift = haversineKm(oldLoc.latitude, oldLoc.longitude, newLat, newLng);
      const newImages = (best.photos || []).map(p => p.url).filter(Boolean).slice(0, 5);

      const update = {
        location: { latitude: newLat, longitude: newLng },
        geoLocation: db.Geo.Point(newLng, newLat),
        address: best.address || spot.address,
        // seed:xxx 类 amapId 替换为真实 POI id,真实 id 不动
        amapId: spot.amapId && spot.amapId.indexOf('seed:') === 0 ? best.id : spot.amapId,
        amapMeta: {
          type: best.type,
          adname: best.adname,
          adcode: best.adcode,
          tel: best.tel
        },
        source: 'amap-refined',
        syncedAt: new Date()
      };
      // 仅在原 images 为空时补图,避免覆盖用户上传的图
      if ((!spot.images || spot.images.length === 0) && newImages.length) {
        update.images = newImages;
        if (!spot.cover && newImages[0]) update.cover = newImages[0];
      }

      diffs.push({
        title: spot.title,
        searchKeyword: keyword,
        amapName: best.name,
        driftKm: drift,
        oldLoc,
        newLoc: { latitude: newLat, longitude: newLng },
        oldAddress: spot.address,
        newAddress: best.address,
        addedImages: update.images ? update.images.length : 0
      });

      if (!dryRun) {
        await db.collection('guides').doc(spot._id).update({ data: update });
        stats.updated++;
      }
    } catch (err) {
      console.warn('[refineSpots] failed:', spot.title, err.message);
      stats.failed++;
    }
  }

  return { stats, dryRun, diffs };
}

/**
 * 校准美食坐标 + 地址
 * 用 AMap 文本搜索每个 food 的 title(可选 address 关键词),匹配置信度高时更新 location/address
 *
 * @param {Object} event
 * @param {boolean} [event.dryRun=false]
 * @param {number}  [event.limit=5]    本次最多处理多少条(防超时)
 * @param {number}  [event.offset=0]
 */
async function refineFoodLocations(event) {
  if (!process.env.AMAP_KEY) {
    return { skipped: true, reason: 'AMAP_KEY 未配置' };
  }
  const dryRun = !!(event && event.dryRun);
  const limit = Math.max(1, Math.min(50, (event && event.limit) || 5));
  const offset = Math.max(0, (event && event.offset) || 0);

  const allFull = await fetchAll({ category: 'food' });
  const all = allFull.slice(offset, offset + limit);
  const stats = {
    matched: 0,
    updated: 0,
    lowConfidence: 0,
    failed: 0,
    total: all.length,
    grandTotal: allFull.length,
    offset,
    nextOffset: offset + all.length < allFull.length ? offset + all.length : null
  };
  const diffs = [];

  for (const food of all) {
    try {
      const keyword = extractSearchKeyword(food.title);
      const pois = await amap.searchPOI({
        keywords: keyword,
        region: NANAO_REGION,
        pageSize: 5,
        maxPages: 1
      });
      // 按 address 关键字选区域锚点(各镇 8km 半径)
      // 这样画海附近的店、青澳湾的店、云澳的店各自只跟相应区域比距离,严过滤澄海/潮阳误匹配
      const anchor = getDistrictAnchor(food.address);
      let best = pickBestMatch(food.title, pois, anchor, { maxDriftKm: 8 });
      // title 找不到时,fallback 用 address 关键字 + region 搜索
      if (!best && food.address) {
        const fallbackKw = extractLandmark(food.address);
        const fallbackPois = await amap.searchPOI({
          keywords: fallbackKw,
          region: NANAO_REGION,
          pageSize: 3,
          maxPages: 1
        });
        best = pickBestMatch(food.title, fallbackPois, anchor, { maxDriftKm: 8 });
      }
      if (!best) {
        stats.lowConfidence++;
        diffs.push({
          title: food.title,
          searchKeyword: keyword,
          action: 'no-match',
          candidates: (pois || []).map(p => ({ name: p.name, addr: p.address }))
        });
        continue;
      }
      stats.matched++;

      const [lngStr, latStr] = (best.location || '').split(',');
      const newLng = Number(lngStr);
      const newLat = Number(latStr);
      if (!isFinite(newLng) || !isFinite(newLat)) {
        stats.failed++;
        continue;
      }

      const oldLoc = food.location || {};
      const drift = haversineKm(oldLoc.latitude, oldLoc.longitude, newLat, newLng);

      const update = {
        location: { latitude: newLat, longitude: newLng },
        geoLocation: db.Geo.Point(newLng, newLat),
        // 美食原 address 多为用户精心写的描述,只在原 address 缺失/异常短时才用 AMap 覆盖
        address: (!food.address || food.address.length < 8) && best.address
          ? best.address
          : food.address,
        amapId: food.amapId || best.id,
        amapMeta: {
          type: best.type,
          adname: best.adname,
          adcode: best.adcode,
          tel: best.tel
        },
        source: 'food-refined',
        syncedAt: new Date()
      };

      diffs.push({
        title: food.title,
        searchKeyword: keyword,
        amapName: best.name,
        amapAddress: best.address,
        driftKm: drift,
        oldLoc,
        newLoc: { latitude: newLat, longitude: newLng }
      });

      if (!dryRun) {
        await db.collection('guides').doc(food._id).update({ data: update });
        stats.updated++;
      }
    } catch (err) {
      console.warn('[refineFood] failed:', food.title, err.message);
      stats.failed++;
    }
  }

  return { stats, dryRun, diffs };
}

/**
 * 给所有 food 按 address 关键字自动分配镇中心坐标
 * 兜底方案:AMap 在南澳餐饮覆盖率极低,大多数小店没法靠 refineFoodLocations 校准
 * 这里直接按 address 文本识别青澳/云澳/深澳/后宅,落到对应镇中心
 *
 * 跳过条件:
 *  - source === 'food-refined' 已被 AMap 校准过,不动
 *  - source === 'food-district' 已分配过镇坐标(避免覆盖人工调整)
 *
 * @param {Object} event
 * @param {boolean} [event.dryRun=false]
 * @param {boolean} [event.force=false]  忽略 source 标记,全部重新分配
 */
async function assignDistrictLocations(event) {
  const dryRun = !!(event && event.dryRun);
  const force = !!(event && event.force);

  const all = await fetchAll({ category: 'food' });
  const stats = {
    total: all.length,
    assigned: 0,
    skipped: 0,
    byDistrict: { 青澳湾: 0, 云澳镇: 0, 深澳镇: 0, 后宅镇: 0 }
  };
  const diffs = [];

  for (const food of all) {
    // 已被 AMap 校准过,跳过(除非 force)
    if (!force && (food.source === 'food-refined' || food.source === 'food-district')) {
      stats.skipped++;
      continue;
    }

    const anchor = getDistrictAnchor(food.address);
    const oldLoc = food.location || {};
    const newLoc = { latitude: anchor.latitude, longitude: anchor.longitude };

    // 小幅扰动,避免同镇多店全部坐标完全相同(每家偏 50-200m)
    // 用 _id 的字符 hash 生成确定性扰动,而不是 Math.random(可重复)
    const jitter = idJitter(food._id || food.title || '');
    newLoc.latitude += jitter.dLat;
    newLoc.longitude += jitter.dLng;

    stats.assigned++;
    stats.byDistrict[anchor.label]++;

    diffs.push({
      title: food.title,
      address: food.address,
      district: anchor.label,
      oldLoc,
      newLoc
    });

    if (!dryRun) {
      await db.collection('guides').doc(food._id).update({
        data: {
          location: newLoc,
          geoLocation: db.Geo.Point(newLoc.longitude, newLoc.latitude),
          source: 'food-district',
          syncedAt: new Date()
        }
      });
    }
  }

  return { stats, dryRun, diffs };
}

/**
 * 基于 id/字符串的确定性小扰动,经纬度各 ±150 m 范围,对称分布
 * 同镇多家店分散在镇中心周围,避免坐标堆叠
 */
function idJitter(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  const h1 = (h >>> 0) % 1000;     // [0, 999]
  const h2 = (h >>> 10) % 1000;    // [0, 999]
  return {
    dLat: (h1 / 1000 - 0.5) * 0.003,  // [-0.0015°, 0.0015°] ≈ ±150m
    dLng: (h2 / 1000 - 0.5) * 0.003
  };
}

/**
 * 从 AMap POI 候选中挑置信度最高的一条
 * 评分维度:
 *   - 名字关系:完全相等(100) > 一方包含另一方(80) > 最长公共子串(30 + len*5)
 *   - 距离哨兵:与原坐标距离 > maxDriftKm 时直接 -100,过远视为错误匹配
 *   - 类型加分:type 包含"景点/景区/旅游/风景/餐饮/酒店"等正向词
 *
 * 最终保留得分 ≥ 40 的候选;返回最高分,没有合格的返回 null
 *
 * @param {string} targetTitle  原始标题
 * @param {Array} pois          AMap 候选 POI
 * @param {{latitude,longitude}} oldLoc  锚点坐标,用于距离哨兵
 * @param {{maxDriftKm:number}} opts
 */
function pickBestMatch(targetTitle, pois, oldLoc, opts) {
  if (!pois || pois.length === 0) return null;
  const t = stripBrackets(targetTitle || '').toLowerCase();
  if (!t) return null;
  const maxDriftKm = (opts && opts.maxDriftKm) || 10;

  const scored = pois.map(p => {
    const name = stripBrackets(p.name || '').toLowerCase();
    if (!name) return { p, score: -1 };

    let score = 0;
    if (name === t) score = 100;
    else if (name.includes(t) && t.length >= 2) score = 80;
    else if (t.includes(name) && name.length >= 2) score = 70;
    else {
      const overlap = longestCommonSubstring(name, t);
      // 至少有 2 个字的连续重叠才认为相关
      if (overlap.length >= 2) score = 30 + Math.min(40, overlap.length * 8);
    }

    // 距离哨兵:超出容忍距离就直接淘汰(即使名字完全相等也不通过 40 阈值)
    if (oldLoc && oldLoc.latitude != null && p.location) {
      const [lng, lat] = String(p.location).split(',').map(Number);
      if (isFinite(lng) && isFinite(lat)) {
        const km = haversineKm(oldLoc.latitude, oldLoc.longitude, lat, lng);
        if (km > maxDriftKm * 3) score -= 300;        // 离谱地远(>3x),硬淘汰
        else if (km > maxDriftKm) score -= 150;       // 超过容忍距离,强扣(即使全等 100 - 150 = -50 也淘汰)
        else if (km <= 1) score += 15;                // 1 km 内,加分
      }
    }

    // 类型加分:景区/酒店/餐饮 等正向词加分,K歌/沐足/电音/派对 等明显是连锁副业,扣分
    const type = String(p.type || '');
    if (/景点|景区|旅游|风景|公园|遗址|塔|湾|灯塔|关|大桥|海岸/.test(type)) score += 10;
    if (/餐饮|美食|酒店|住宿|宾馆/.test(type)) score += 5;
    if (/K歌|沐足|按摩|KTV|网吧|休闲娱乐/.test(type + p.name)) score -= 30;

    return { p, score };
  })
  .filter(x => x.score >= 40)
  .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].p : null;
}

/**
 * 从原始标题里抽核心搜索关键词:
 *  - 去括号(中英)
 *  - 去掉 "·xxx" 后面的修饰:"北回归线标志塔·自然之门" → "北回归线标志塔"
 *  - 只剥 ≥3 字的明显修饰尾缀(风景区/国家森林公园/观景台 等),保留 POI 整名(如"南澳大桥"、"长山尾灯塔")
 *  - 美食店名(含店/坊/馆/号 等)整体保留,不剥
 */
function extractSearchKeyword(title) {
  let s = stripBrackets(title || '').trim();
  if (!s) return '';
  // 去 ·xxx 后缀
  if (s.indexOf('·') > 0) s = s.split('·')[0];
  // 仅剥 3 字以上的明显景区修饰词,避免把"南澳大桥"剥成"南澳"
  const tails = [
    '国家森林公园', '森林公园', '风景区', '观景台',
    '风车长廊', '古城遗址'
  ];
  for (const t of tails) {
    // 剥后剩余至少 2 字
    if (s.length >= t.length + 2 && s.endsWith(t)) {
      s = s.slice(0, -t.length);
      break;
    }
  }
  return s.trim() || stripBrackets(title);
}

/** 最长公共子串(用于宽松匹配) */
function longestCommonSubstring(a, b) {
  if (!a || !b) return '';
  const m = a.length, n = b.length;
  if (m === 0 || n === 0) return '';
  let max = 0, end = 0;
  // 单行 DP 数组,空间 O(n)
  const prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    let prevDiag = 0;
    for (let j = 1; j <= n; j++) {
      const curr = a[i - 1] === b[j - 1] ? prevDiag + 1 : 0;
      prevDiag = prev[j];
      prev[j] = curr;
      if (curr > max) { max = curr; end = i; }
    }
  }
  return a.slice(end - max, end);
}

/** 去掉括号(中英)及其内容,如 "阿伟海鲜坊(海鲜大排档)" → "阿伟海鲜坊" */
function stripBrackets(str) {
  return String(str || '')
    .replace(/[(（][^)）]*[)）]/g, '')
    .trim();
}

/** 从地址里抽出有辨识度的地标,fallback 搜索用 */
function extractLandmark(address) {
  // 取地址末段(常含具体地标),例:"...金龙路157号" → "金龙路157号"
  const segs = String(address || '').split(/[县镇区市]/);
  return segs[segs.length - 1].slice(0, 20) || address;
}

/**
 * 根据 food.address 文本里的乡镇 / 地标关键字,返回所在区域的中心坐标作为锚点
 * 南澳岛各乡镇相距 10-20 km,按区域内 ≤ 8 km 容忍距离,可严格剔除澄海/潮阳的同名店
 */
function getDistrictAnchor(address) {
  const addr = String(address || '');
  // 青澳湾及周边地标(北回归线广场、海湾路、锦骏黄金海岸都在青澳)
  if (/青澳|北回归线|海湾路|锦骏|后窑村|336省道/.test(addr)) {
    return { latitude: 23.4566, longitude: 117.1310, label: '青澳湾' };
  }
  // 云澳镇及周边(台湾街/云星华府/澳前村/走马埔)
  if (/云澳|台湾街|云星华府|澳前村|走马埔/.test(addr)) {
    return { latitude: 23.4019, longitude: 117.0721, label: '云澳镇' };
  }
  // 深澳镇及周边(总兵府/南光新村东区?不,实际南光新村在后宅)
  if (/深澳/.test(addr)) {
    return { latitude: 23.4520, longitude: 117.0631, label: '深澳镇' };
  }
  // 后宅/隆澳/海滨/民宿/金龙路/崇文/龙滨/龙地/环城 等关键字 → 后宅镇(也是默认)
  return { latitude: 23.4221, longitude: 116.9799, label: '后宅镇' };
}

/** Haversine 距离 km */
function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lat2 == null) return null;
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000;
}

/** 拉取数据库所有 spot,自动翻页(单次 limit 100) */
async function fetchAllSpots() {
  return fetchAll({ category: 'spot' });
}

/** 通用翻页拉取 */
async function fetchAll(where) {
  const all = [];
  let offset = 0;
  while (offset < 1000) {
    const res = await db.collection('guides')
      .where(where)
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

  const fieldNames = Object.keys(doc).sort();
  const geoInfo = {
    hasGeoLocation: 'geoLocation' in doc,
    geoLocationValue: doc.geoLocation,
    geoLocationType: typeof doc.geoLocation,
    geoLocationKeys: doc.geoLocation ? Object.keys(doc.geoLocation) : null
  };

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
