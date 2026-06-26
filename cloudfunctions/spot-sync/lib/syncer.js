/**
 * 同步器:把 seed + amap + qweather 数据合并 upsert 到 guides 集合
 * - 唯一键:amapId
 * - 写入字段保留 guides schema (title/summary/images/tags/location/views/likes/status/...)
 * - 新增字段:weather, walkingFromHostel, geoLocation, source, syncedAt, content (HTML 富文本)
 */
const cloud = require('wx-server-sdk');

const db = cloud.database();
const _ = db.command;

/**
 * 把单条 spot upsert 到 guides 集合
 * @param {Object} spot  必含 amapId, title, location:{latitude,longitude}
 * @param {string} source  'seed' | 'amap'
 */
async function upsertSpot(spot, source = 'seed') {
  if (!spot.amapId) throw new Error('upsertSpot 缺少 amapId');
  if (!spot.location || typeof spot.location.latitude !== 'number') {
    throw new Error(`upsertSpot ${spot.amapId} location 非法`);
  }

  const now = new Date();
  const { latitude, longitude } = spot.location;

  // 详情页用的富文本 content:优先用 spot.content,否则由结构化字段生成
  const content = spot.content && spot.content.trim()
    ? spot.content
    : buildContent(spot);

  // 公共写入字段
  const data = {
    title: spot.title,
    summary: spot.summary || '',
    address: spot.address || '',
    location: { latitude, longitude },
    // 注意:Geo.Point 参数顺序是 (longitude, latitude)
    geoLocation: db.Geo.Point(longitude, latitude),
    category: 'spot',
    tags: Array.isArray(spot.tags) ? spot.tags : [],
    images: Array.isArray(spot.images) ? spot.images : [],
    amapId: spot.amapId,
    source,
    syncedAt: now,
    updateTime: now,
    content
  };

  // 可选字段:有则带,无则不覆盖
  if (typeof spot.weight === 'number') data.weight = spot.weight;
  if (spot.cover) data.cover = spot.cover;
  if (spot.weather) data.weather = spot.weather;
  if (spot.walkingFromHostel) data.walkingFromHostel = spot.walkingFromHostel;
  if (spot.amapMeta) data.amapMeta = spot.amapMeta;
  if (Array.isArray(spot.info) && spot.info.length) data.info = spot.info;

  // 按 amapId 查是否已存在
  const existRes = await db.collection('guides').where({ amapId: spot.amapId }).limit(1).get();
  if (existRes.data && existRes.data.length > 0) {
    const id = existRes.data[0]._id;
    await db.collection('guides').doc(id).update({ data });
    return { _id: id, op: 'update' };
  } else {
    // 新增:补齐默认字段
    const createData = {
      ...data,
      info: data.info || buildInfo(spot),
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

/**
 * 根据 spot 的结构化字段生成富文本 HTML
 * 字段:summary, highlights[], bestTime, duration, tips[], address, tags[]
 */
function buildContent(spot) {
  const parts = [];

  if (spot.summary) {
    parts.push(`<p>${escapeHtml(spot.summary)}</p>`);
  }

  if (Array.isArray(spot.highlights) && spot.highlights.length) {
    parts.push('<h3>✨ 亮点</h3>');
    parts.push('<ul>' + spot.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('') + '</ul>');
  }

  if (spot.bestTime) {
    parts.push('<h3>📅 推荐时段</h3>');
    parts.push(`<p>${escapeHtml(spot.bestTime)}</p>`);
  }

  if (spot.duration) {
    parts.push('<h3>⏱ 建议时长</h3>');
    parts.push(`<p>${escapeHtml(spot.duration)}</p>`);
  }

  if (Array.isArray(spot.tips) && spot.tips.length) {
    parts.push('<h3>💡 小贴士</h3>');
    parts.push('<ul>' + spot.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('') + '</ul>');
  }

  if (spot.address) {
    parts.push('<h3>📍 地址</h3>');
    parts.push(`<p>${escapeHtml(spot.address)}</p>`);
  }

  // 即使所有字段为空,也至少有 summary;若连 summary 都没有,给一个占位
  if (parts.length === 0) {
    return `<p>${escapeHtml(spot.title || '景点详情')}</p>`;
  }

  return parts.join('');
}

/**
 * 生成 info 字段(实用信息列表),供详情页"INFO · 实用信息"区使用
 */
function buildInfo(spot) {
  const info = [];
  if (spot.bestTime) info.push({ label: '推荐时段', value: spot.bestTime });
  if (spot.duration) info.push({ label: '建议时长', value: spot.duration });
  if (spot.address) info.push({ label: '地址', value: spot.address });
  return info;
}

/** 简易 HTML 转义,防止 summary/tip 里有特殊字符破坏 rich-text */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 合并天气字段(不覆盖已有 weather 全部数据,而是 setter 模式)
 */
function mergeWeather(spot, now, forecast3d) {
  if (!now && (!forecast3d || forecast3d.length === 0)) return spot;
  return {
    ...spot,
    weather: {
      now: now || null,
      forecast3d: forecast3d || [],
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * 合并步行距离(从画海民宿出发)
 */
function mergeWalking(spot, walkInfo) {
  if (!walkInfo) return spot;
  return {
    ...spot,
    walkingFromHostel: {
      distance: walkInfo.distance, // m
      duration: walkInfo.duration, // s
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * 把 AMap POI 原始数据规范化为 spot 文档结构
 */
function normalizeAmapPOI(poi) {
  const [lngStr, latStr] = (poi.location || '').split(',');
  const lng = Number(lngStr);
  const lat = Number(latStr);
  if (!isFinite(lng) || !isFinite(lat)) return null;
  return {
    amapId: poi.id,
    title: poi.name,
    summary: (poi.business && poi.business.tag) || '',
    address: poi.address || (poi.adname || '') + (poi.business && poi.business.cityname || ''),
    location: { latitude: lat, longitude: lng },
    tags: [poi.type ? poi.type.split(';').slice(-1)[0] : '景点'].filter(Boolean),
    images: (poi.photos || []).map(p => p.url).filter(Boolean).slice(0, 5),
    amapMeta: {
      type: poi.type,
      adname: poi.adname,
      adcode: poi.adcode,
      tel: poi.tel
    }
  };
}

module.exports = {
  upsertSpot,
  mergeWeather,
  mergeWalking,
  normalizeAmapPOI,
  buildContent,
  buildInfo
};
