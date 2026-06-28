/**
 * 潮汐模块
 *
 * 策略:tides_cache 集合按日期键缓存,命中直接返;未命中调 WorldTides 一次性拉 7 天写入
 *
 * 数据结构(tides_cache):
 *   {
 *     date: 'YYYY-MM-DD',
 *     heights: [{ dt, date, height }, ...]  // 96 点/天(15 分钟粒度)
 *     extremes: [{ dt, date, height, type:'High'|'Low' }, ...]
 *     station: string|null,
 *     cachedAt: Date
 *   }
 *
 * 永久缓存策略:历史日期数据不变(永久);未来日期一旦写入也固化(WorldTides 预测精度足够,
 *               每周手动调一次 refresh 类型即可,常态零 KEY 消耗)
 */
const cloud = require('wx-server-sdk');
const worldtides = require('./worldtides');

const db = cloud.database();

// 南澳岛中心坐标(青澳湾附近),可由环境变量覆盖
const TIDE_LAT = Number(process.env.TIDE_LAT) || 23.42;
const TIDE_LNG = Number(process.env.TIDE_LNG) || 117.13;

/**
 * 取指定日期的潮汐数据
 * @param {string} date  'YYYY-MM-DD',缺省今天
 * @returns {Promise<{date, heights, extremes, station, cachedAt, todayKeyTimes}|null>}
 */
async function getTide(date) {
  const target = date || todayYMD();

  // 1. 命中缓存直接返(集合不存在视为未命中)
  const cached = await safeQueryCache({ date: target });
  if (cached) {
    return decorate(cached);
  }

  // 2. 未命中:优先看 seed-tides 是否覆盖该日期
  const seedHit = trySeedTides(target);
  if (seedHit) {
    // 写一份到 cache(下次直接读 cache,无需重算插值)
    await writeCache(seedHit);
    return decorate(seedHit);
  }

  // 3. seed 也没有 → 调 WorldTides(需要 WORLDTIDES_KEY)
  if (!process.env.WORLDTIDES_KEY) {
    // 友好降级:返回 null + 通过 tideSourceHint 告诉前端原因
    return null;
  }

  let api;
  try {
    api = await worldtides.fetchTides({
      lat: TIDE_LAT,
      lng: TIDE_LNG,
      date: target,
      days: 7
    });
  } catch (err) {
    throw err;
  }

  // 4. 按日期切片写入 cache(7 天 = 7 条 doc)
  const byDate = {};
  for (const h of (api.heights || [])) {
    const dKey = ymdFromIsoDate(h.date);
    if (!byDate[dKey]) byDate[dKey] = { date: dKey, heights: [], extremes: [], station: api.station };
    byDate[dKey].heights.push(h);
  }
  for (const e of (api.extremes || [])) {
    const dKey = ymdFromIsoDate(e.date);
    if (!byDate[dKey]) byDate[dKey] = { date: dKey, heights: [], extremes: [], station: api.station };
    byDate[dKey].extremes.push(e);
  }

  for (const dKey of Object.keys(byDate)) {
    await writeCache(byDate[dKey]);
  }

  // 5. 返回目标日期的数据
  const targetData = byDate[target];
  if (!targetData) return null;
  return decorate(targetData);
}

/** catch -502005 的安全 cache 查询 */
async function safeQueryCache(where) {
  try {
    const r = await db.collection('tides_cache').where(where).limit(1).get();
    return (r.data && r.data[0]) || null;
  } catch (err) {
    const msg = (err && (err.errMsg || err.message)) || '';
    if (err.errCode === -502005 || /not exist/i.test(msg)) return null;
    throw err;
  }
}

/** 安全写 cache,集合不存在时自动用 createCollection 创建 */
async function writeCache(data) {
  await ensureCacheTable();
  const now = new Date();
  const payload = { ...data, cachedAt: now };
  const exist = await safeQueryCache({ date: data.date });
  if (exist) {
    await db.collection('tides_cache').doc(exist._id).update({ data: payload });
  } else {
    await db.collection('tides_cache').add({ data: payload });
  }
}

/**
 * 确保 tides_cache 集合存在(WeChat 云开发的 add() 不会自动建表)
 * module-level 缓存,同实例多次调用只第一次走 createCollection
 */
let _tidesCacheEnsured = false;
async function ensureCacheTable() {
  if (_tidesCacheEnsured) return;
  try {
    await db.createCollection('tides_cache');
  } catch (err) {
    // 已存在 → ignore;其他错误也吞掉(避免 ensure 阻塞主流程,反正后续 add 会暴露真实错误)
    const msg = (err && (err.errMsg || err.message)) || '';
    if (!/already exist|existed/i.test(msg) && err.errCode !== -502002) {
      console.warn('[tide] createCollection tides_cache failed:', msg);
    }
  }
  _tidesCacheEnsured = true;
}

/**
 * 尝试从手工录入的 seed-tides 数据中找指定日期
 * - seed-tides.js 提供 extremes(高低潮 4 点),自动用 cos 半周期插值出 96 点 heights
 * - 找不到匹配日期返回 null
 */
function trySeedTides(date) {
  let SEED;
  try {
    SEED = require('./seed-tides');
  } catch (e) {
    return null;
  }
  const match = SEED.find(d => d.date === date);
  if (!match || !Array.isArray(match.extremes) || match.extremes.length < 2) {
    return null;
  }
  // 把 'HH:MM' 转 Unix 秒(GMT+8)
  const extremesNorm = match.extremes.map(e => ({
    dt: hmToUnixSec(date, e.time),
    date: `${date}T${e.time}:00+0800`,
    height: Number(e.height),
    type: String(e.type || '').toLowerCase() === 'high' ? 'High' : 'Low'
  })).sort((a, b) => a.dt - b.dt);

  // 用 cos 半周期插值 → 96 点 heights(15min 粒度)
  const heights = interpolateHeights(date, extremesNorm);

  return {
    date,
    heights,
    extremes: extremesNorm,
    station: match.station || '南澳青澳湾(手工录入)'
  };
}

/**
 * 'HH:MM' + date(YYYY-MM-DD) → Unix 秒(假定中国时区 UTC+8)
 */
function hmToUnixSec(date, hm) {
  const [hh, mm] = String(hm).split(':').map(Number);
  // 用 ISO 字符串构造,确保浏览器/Node 一致解析
  const iso = `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+08:00`;
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * 从 N 个高低潮点(已按 dt 升序),用 cos 半周期插值生成 96 个 15min 间隔的 height 点
 *
 * 公式:相邻两个 extremes 之间是 cos 半周期
 *   h(t) = (h1 + h2)/2 + (h1 - h2)/2 * cos(π * (t - t1) / (t2 - t1))
 * 这种插值精度足以画曲线,误差对游客无感(真值高频分潮平均值)
 */
function interpolateHeights(date, extremes) {
  if (extremes.length < 2) return [];
  const startSec = hmToUnixSec(date, '00:00');
  const endSec = startSec + 86400 - 900; // 23:45
  const heights = [];

  for (let t = startSec; t <= endSec; t += 900) {
    // 找 t 所在 extremes 区间(若超出,用首/末段外推)
    let e1, e2;
    if (t <= extremes[0].dt) {
      // 早于第一个 extreme:用前一段同周期延伸
      e1 = extremes[0];
      e2 = extremes[1];
      // 反向延伸:t 在 [e1.dt - period, e1.dt],h 沿 cos 反向
      const period = e2.dt - e1.dt;
      const phase = (e1.dt - t) / period;
      const h = (e1.height + e2.height) / 2 + (e1.height - e2.height) / 2 * Math.cos(Math.PI * phase);
      heights.push({ dt: t, date: secToIso(t), height: round2(h) });
      continue;
    }
    if (t >= extremes[extremes.length - 1].dt) {
      // 晚于最后一个 extreme:同样外推
      e1 = extremes[extremes.length - 2];
      e2 = extremes[extremes.length - 1];
      const period = e2.dt - e1.dt;
      const phase = (t - e2.dt) / period;
      // 镜像延续(假设下半周期持续)
      const h = (e1.height + e2.height) / 2 + (e2.height - e1.height) / 2 * Math.cos(Math.PI * phase);
      heights.push({ dt: t, date: secToIso(t), height: round2(h) });
      continue;
    }
    // 正常区间内:找 e1.dt < t <= e2.dt
    for (let i = 0; i < extremes.length - 1; i++) {
      if (t > extremes[i].dt && t <= extremes[i + 1].dt) {
        e1 = extremes[i];
        e2 = extremes[i + 1];
        break;
      }
    }
    if (!e1 || !e2) continue;
    const ratio = (t - e1.dt) / (e2.dt - e1.dt);
    const h = (e1.height + e2.height) / 2 + (e1.height - e2.height) / 2 * Math.cos(Math.PI * ratio);
    heights.push({ dt: t, date: secToIso(t), height: round2(h) });
  }
  return heights;
}

function secToIso(sec) {
  const d = new Date(sec * 1000);
  // 输出 GMT+8 ISO
  const pad = n => String(n).padStart(2, '0');
  const off = d.getTimezoneOffset();
  // 用本地时间格式化(在中国云函数运行,UTC+8)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+0800`;
}

/**
 * 把单日的 extremes(4 个高低潮)展开为完整的一天数据(含 96 点 heights)
 * 给 index.js::seedTides / seedTidesManual 复用
 *
 * @param {Object} dayInput  { date:'YYYY-MM-DD', extremes:[{time,height,type}], station? }
 * @returns {Object|null}  { date, extremes, heights, station } 或 null(数据不合格)
 */
function expandSeedDay(dayInput) {
  if (!dayInput || !dayInput.date || !Array.isArray(dayInput.extremes) || dayInput.extremes.length < 2) {
    return null;
  }
  const date = dayInput.date;
  const extremesNorm = dayInput.extremes
    .map(e => ({
      dt: hmToUnixSec(date, e.time),
      date: `${date}T${e.time}:00+0800`,
      height: Number(e.height),
      type: String(e.type || '').toLowerCase() === 'high' ? 'High' : 'Low'
    }))
    .sort((a, b) => a.dt - b.dt);

  const heights = interpolateHeights(date, extremesNorm);

  return {
    date,
    extremes: extremesNorm,
    heights,
    station: dayInput.station || '南澳青澳湾'
  };
}

module.exports = { getTide, expandSeedDay };

/** 在 doc 上派生 todayKeyTimes(供前端文字展示)+ currentHeight/currentTrend */
function decorate(doc) {
  if (!doc) return null;
  const extremes = doc.extremes || [];
  const heights = doc.heights || [];

  // 关键时刻(高低潮)按时刻升序
  const todayKeyTimes = extremes
    .slice()
    .sort((a, b) => (a.dt || 0) - (b.dt || 0))
    .map(e => ({
      time: hmFromIsoDate(e.date),
      height: round1(e.height),
      type: (e.type || '').toLowerCase()  // 'high' | 'low'
    }));

  // 当前潮高 / 趋势(基于当前时间和 heights 序列)
  const nowSec = Math.floor(Date.now() / 1000);
  let current = null;
  let trend = null;
  if (heights.length > 0) {
    // 找最接近 now 的 height 点
    let nearestIdx = 0;
    let nearestDiff = Infinity;
    heights.forEach((h, i) => {
      const diff = Math.abs((h.dt || 0) - nowSec);
      if (diff < nearestDiff) { nearestDiff = diff; nearestIdx = i; }
    });
    current = round2(heights[nearestIdx].height);
    // 趋势:对比 30 分钟前后的值
    const prev = heights[Math.max(0, nearestIdx - 2)];
    const next = heights[Math.min(heights.length - 1, nearestIdx + 2)];
    if (prev && next && Math.abs(next.height - prev.height) < 0.05) {
      trend = 'slack';
    } else if (next && prev) {
      trend = next.height > prev.height ? 'rising' : 'falling';
    }
  }

  return {
    date: doc.date,
    heights,
    extremes,
    station: doc.station || null,
    cachedAt: doc.cachedAt,
    // 派生字段
    todayKeyTimes,
    currentHeight: current,
    currentTrend: trend
  };
}

// ---- 时间工具 ----
function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function ymdFromIsoDate(iso) {
  // WorldTides 返回如 '2026-06-27T00:00+0800',直接取前 10 字符
  return String(iso || '').slice(0, 10);
}

function hmFromIsoDate(iso) {
  // 取 'T' 后 5 字符 'HH:MM'
  const s = String(iso || '');
  const tIdx = s.indexOf('T');
  if (tIdx < 0) return '';
  return s.slice(tIdx + 1, tIdx + 6);
}

function round1(n) { return Math.round(Number(n) * 10) / 10; }
function round2(n) { return Math.round(Number(n) * 100) / 100; }
