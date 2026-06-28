/**
 * 应急 POI 模块
 *
 * 数据来源:emergency_pois 集合(seed 写入)
 * 不调外部 API
 *
 * 若 event 带 userLocation:{latitude,longitude},haversine 算距离 + 按距离升序
 * 否则按 weight 降序 + category 自然顺序
 */
const cloud = require('wx-server-sdk');
const db = cloud.database();

async function getEmergencyPOIs(userLocation) {
  let res;
  try {
    res = await db.collection('emergency_pois')
      .orderBy('weight', 'desc')
      .limit(100)
      .get();
  } catch (err) {
    const msg = (err && (err.errMsg || err.message)) || '';
    if (err.errCode === -502005 || /not exist/i.test(msg)) {
      return { grouped: {}, list: [], hasLocation: !!userLocation };
    }
    throw err;
  }
  const pois = res.data || [];

  // 拆多号码(空格 / 斜杠 / 顿号 分隔)→ phoneList 数组
  pois.forEach(p => {
    const raw = String(p.phone || '');
    // 一个 POI 可能挂多个号码,如 '0754-89802123 / 0754-86803033'
    const parts = raw.split(/\s*[/、,]\s*/).map(s => s.trim()).filter(Boolean);
    p.phoneList = parts.map(s => ({
      raw: s,
      clean: s.replace(/[^\d]/g, '')  // 拨号用的纯数字
    }));
    // 兼容旧字段:phone 保留首号码
    p.phone = parts[0] || '';
    p.phoneClean = p.phoneList[0] ? p.phoneList[0].clean : '';
  });

  // 有定位则附加距离 + 排序
  if (userLocation && isFinite(userLocation.latitude) && isFinite(userLocation.longitude)) {
    pois.forEach(p => {
      if (isFinite(p.latitude) && isFinite(p.longitude) && p.latitude !== 0) {
        p.distanceKm = haversineKm(
          userLocation.latitude, userLocation.longitude,
          p.latitude, p.longitude
        );
        p.distanceDisplay = formatDistance(p.distanceKm);
      } else {
        p.distanceKm = null;
        p.distanceDisplay = '';
      }
    });
    // 在每个 category 内部按距离重排(category 间顺序保持 weight)
    // 简单实现:整体按 distance 排,无 distance 的放后面
    pois.sort((a, b) => {
      const ad = a.distanceKm == null ? Infinity : a.distanceKm;
      const bd = b.distanceKm == null ? Infinity : b.distanceKm;
      return ad - bd;
    });
  }

  // 按 category 分组
  const grouped = {};
  for (const p of pois) {
    const cat = p.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  return {
    grouped,
    list: pois,
    hasLocation: !!userLocation
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
  return Math.round(R * c * 100) / 100;
}

function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

module.exports = { getEmergencyPOIs };
