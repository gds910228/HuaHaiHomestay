/**
 * info-board 云函数入口
 *
 * event.type 分发:
 *  - all              聚合 weather + tide + ferries + emergency,Promise.allSettled 容错
 *  - weather          仅天气
 *  - tide             仅潮汐(可选 event.date)
 *  - ferries          仅渡轮班次
 *  - emergency        仅应急 POI(可选 event.userLocation)
 *  - seedFerries      写入 ferries seed
 *  - seedEmergency    写入 emergency_pois seed
 *  - inspect          排查诊断
 *
 * 调用示例:
 *   { "type": "all", "userLocation": { "latitude": 23.43, "longitude": 117.07 } }
 *   { "type": "tide", "date": "2026-06-28" }
 *   { "type": "seedFerries" }
 *
 * 返回:{ success, data, errMsg? }
 *  - 单模块:data 即模块结果
 *  - all:data = { weather, tide, ferries, emergency, errors: [{module, errMsg}] }
 *           即使某模块失败,其他模块的成功数据仍正常返回
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const weather = require('./lib/weather');
const tide = require('./lib/tide');
const ferries = require('./lib/ferries');
const emergency = require('./lib/emergency');

exports.main = async (event) => {
  const type = (event && event.type) || 'all';
  console.log(`[info-board] type=${type}`);

  try {
    switch (type) {
      case 'all':
        return { success: true, data: await getAll(event) };
      case 'weather':
        return { success: true, data: await weather.getWeather() };
      case 'tide':
        return { success: true, data: await tide.getTide(event && event.date) };
      case 'ferries':
        return { success: true, data: await ferries.getFerries() };
      case 'emergency':
        return { success: true, data: await emergency.getEmergencyPOIs(event && event.userLocation) };
      case 'seedFerries':
        return { success: true, data: await seedFerries() };
      case 'seedEmergency':
        return { success: true, data: await seedEmergency() };
      case 'seedTides':
        return { success: true, data: await seedTides() };
      case 'seedTidesManual':
        return { success: true, data: await seedTidesManual(event) };
      case 'seedAll':
        return { success: true, data: await seedAll() };
      case 'inspect':
        return { success: true, data: await inspect() };
      default:
        return { success: false, errMsg: `Unknown type: ${type}` };
    }
  } catch (err) {
    console.error('[info-board] error:', err);
    return { success: false, errMsg: err.message, stack: err.stack };
  }
};

/** 并发取 4 大模块,Promise.allSettled 保证部分失败不影响其他 */
async function getAll(event) {
  const userLocation = event && event.userLocation;
  const date = event && event.date;

  const results = await Promise.allSettled([
    weather.getWeather(),
    tide.getTide(date),
    ferries.getFerries(),
    emergency.getEmergencyPOIs(userLocation)
  ]);

  const errors = [];
  const labels = ['weather', 'tide', 'ferries', 'emergency'];
  const out = { weather: null, tide: null, ferries: null, emergency: null };

  results.forEach((r, idx) => {
    const key = labels[idx];
    if (r.status === 'fulfilled') {
      out[key] = r.value;
    } else {
      errors.push({ module: key, errMsg: (r.reason && r.reason.message) || String(r.reason) });
      console.warn(`[info-board.all] ${key} failed:`, r.reason && r.reason.message);
    }
  });

  out.errors = errors;
  return out;
}

async function seedFerries() {
  const db = cloud.database();
  await ensureCollection(db, 'ferries');
  const SEED = require('./lib/seed-ferries');
  const stats = { inserted: 0, updated: 0, failed: 0 };
  for (const f of SEED) {
    try {
      const exist = await safeWhereGet(db, 'ferries', { route: f.route });
      const data = { ...f, lastUpdated: new Date() };
      if (exist) {
        await db.collection('ferries').doc(exist._id).update({ data });
        stats.updated++;
      } else {
        await db.collection('ferries').add({ data });
        stats.inserted++;
      }
    } catch (err) {
      console.warn('[seedFerries]', f.route, err.errMsg || err.message);
      stats.failed++;
    }
  }
  return stats;
}

async function seedEmergency() {
  const db = cloud.database();
  await ensureCollection(db, 'emergency_pois');
  const SEED = require('./lib/seed-emergency');
  const stats = { inserted: 0, updated: 0, failed: 0 };
  for (const p of SEED) {
    try {
      // 唯一键:name + category(避免重复 seed)
      const exist = await safeWhereGet(db, 'emergency_pois', { name: p.name, category: p.category });
      const data = { ...p, updatedAt: new Date() };
      if (exist) {
        await db.collection('emergency_pois').doc(exist._id).update({ data });
        stats.updated++;
      } else {
        await db.collection('emergency_pois').add({ data });
        stats.inserted++;
      }
    } catch (err) {
      console.warn('[seedEmergency]', p.name, err.errMsg || err.message);
      stats.failed++;
    }
  }
  return { ...stats, total: SEED.length };
}

/**
 * 兼容"集合不存在"的 where 查询
 *
 * WeChat 云开发坑:db.collection(X).where().get() 在集合不存在时 throw -502005
 * 但 add() 会自动创建集合。这个 helper catch -502005,返回 null 让调用方走 add 分支。
 *
 * @returns {Promise<Object|null>}  匹配的第一条文档,或 null(包含集合不存在的情况)
 */
async function safeWhereGet(db, collection, where) {
  try {
    const r = await db.collection(collection).where(where).limit(1).get();
    return (r.data && r.data[0]) || null;
  } catch (err) {
    const code = err && err.errCode;
    const msg = (err && (err.errMsg || err.message)) || '';
    // -502005 = collection not exists;部分 SDK 版本只在 errMsg 里写 'not exist'
    if (code === -502005 || /not exist/i.test(msg) || /DATABASE_COLLECTION_NOT_EXIST/i.test(msg)) {
      return null;
    }
    throw err;
  }
}

/**
 * 确保集合存在(WeChat 云开发的 add() 不会自动建表,必须显式 createCollection)
 *
 * 已存在时 createCollection 会 throw,errCode 通常是 -502002 或 errMsg 含 "already exist"
 * 这里 catch 掉,把"已存在"视为成功
 *
 * 文档:wx-server-sdk 2.6+ 起支持 db.createCollection()
 */
async function ensureCollection(db, name) {
  try {
    await db.createCollection(name);
    console.log(`[ensureCollection] 创建集合: ${name}`);
  } catch (err) {
    const code = err && err.errCode;
    const msg = (err && (err.errMsg || err.message)) || '';
    if (code === -502002 || /already exist/i.test(msg) || /existed/i.test(msg)) {
      // 已存在,正常
      return;
    }
    console.warn(`[ensureCollection] ${name} 创建失败(可能无权限或其他错误):`, msg);
    throw err;
  }
}

/**
 * 写入演示用的潮汐数据(seed-tides.js 内置的近似数据)
 * 用途:第一次部署后立刻让仪表盘有数据展示;后续运营从中国海事服务网抄真实数据 → 用 seedTidesManual 覆盖
 *
 * 流程:对每一天的 4 个 extremes,调 tide.expandSeedDay() 插值出 96 点 heights,完整写入 cache
 */
async function seedTides() {
  const db = cloud.database();
  await ensureCollection(db, 'tides_cache');
  const SEED = require('./lib/seed-tides');
  const stats = { inserted: 0, updated: 0, failed: 0, source: 'seed-tides.js (近似演示数据)' };
  for (const d of SEED) {
    try {
      const expanded = tide.expandSeedDay({ ...d, station: d.station || '南澳青澳湾(演示)' });
      if (!expanded) { stats.failed++; continue; }

      const exist = await safeWhereGet(db, 'tides_cache', { date: expanded.date });
      const data = {
        date: expanded.date,
        extremes: expanded.extremes,
        heights: expanded.heights,
        station: expanded.station,
        source: 'seed',
        cachedAt: new Date()
      };
      if (exist) {
        await db.collection('tides_cache').doc(exist._id).update({ data });
        stats.updated++;
      } else {
        await db.collection('tides_cache').add({ data });
        stats.inserted++;
      }
    } catch (err) {
      console.warn('[seedTides]', d.date, err.errMsg || err.message);
      stats.failed++;
    }
  }
  return { ...stats, total: SEED.length };
}

/**
 * 手工录入潮汐数据 — 推荐运营每 1-2 周操作一次
 *
 * 调用示例:
 *   {
 *     "type": "seedTidesManual",
 *     "data": [
 *       {
 *         "date": "2026-06-28",
 *         "station": "南澳青澳湾(海事服务网)",
 *         "extremes": [
 *           {"time":"02:30","height":0.5,"type":"low"},
 *           {"time":"08:45","height":2.5,"type":"high"},
 *           {"time":"14:50","height":0.7,"type":"low"},
 *           {"time":"21:10","height":2.3,"type":"high"}
 *         ]
 *       },
 *       ... 更多日期
 *     ]
 *   }
 */
async function seedTidesManual(event) {
  const list = (event && event.data) || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('event.data 必填,且为非空数组');
  }
  const db = cloud.database();
  await ensureCollection(db, 'tides_cache');
  const stats = { inserted: 0, updated: 0, failed: 0, total: list.length };
  for (const d of list) {
    try {
      const expanded = tide.expandSeedDay(d);
      if (!expanded) {
        console.warn('[seedTidesManual] 数据不合格:', d);
        stats.failed++;
        continue;
      }
      const exist = await safeWhereGet(db, 'tides_cache', { date: expanded.date });
      const data = {
        date: expanded.date,
        extremes: expanded.extremes,
        heights: expanded.heights,
        station: expanded.station,
        source: 'manual',
        cachedAt: new Date()
      };
      if (exist) {
        await db.collection('tides_cache').doc(exist._id).update({ data });
        stats.updated++;
      } else {
        await db.collection('tides_cache').add({ data });
        stats.inserted++;
      }
    } catch (err) {
      console.warn('[seedTidesManual]', d.date, err.errMsg || err.message);
      stats.failed++;
    }
  }
  return stats;
}

/** 一键 seed 三个集合(用于首次部署) */
async function seedAll() {
  return {
    ferries: await seedFerries(),
    emergency: await seedEmergency(),
    tides: await seedTides()
  };
}

async function inspect() {
  const db = cloud.database();
  const [tideRes, ferriesRes, poisRes] = await Promise.all([
    db.collection('tides_cache').count().catch(() => ({ total: 0 })),
    db.collection('ferries').count().catch(() => ({ total: 0 })),
    db.collection('emergency_pois').count().catch(() => ({ total: 0 }))
  ]);
  return {
    env: {
      hasWorldtidesKey: !!process.env.WORLDTIDES_KEY,
      hasQweatherKey: !!process.env.QWEATHER_KEY,
      tideLat: process.env.TIDE_LAT || '23.42(default)',
      tideLng: process.env.TIDE_LNG || '117.13(default)'
    },
    collections: {
      tides_cache: tideRes.total,
      ferries: ferriesRes.total,
      emergency_pois: poisRes.total
    }
  };
}
