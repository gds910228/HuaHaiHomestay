/**
 * 同步器:把 seed + amap + qweather 数据合并 upsert 到 guides 集合
 * - 唯一键:amapId
 * - 写入字段保留 guides schema (title/summary/images/tags/location/views/likes/status/...)
 * - 新增字段:weather, walkingFromHostel, geoLocation, source, syncedAt
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
    updateTime: now
  };

  // 可选字段:有则带,无则不覆盖
  if (typeof spot.weight === 'number') data.weight = spot.weight;
  if (spot.cover) data.cover = spot.cover;
  if (spot.weather) data.weather = spot.weather;
  if (spot.walkingFromHostel) data.walkingFromHostel = spot.walkingFromHostel;
  if (spot.amapMeta) data.amapMeta = spot.amapMeta;

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
      content: '',
      info: [],
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

module.exports = { upsertSpot, mergeWeather, mergeWalking, normalizeAmapPOI };
