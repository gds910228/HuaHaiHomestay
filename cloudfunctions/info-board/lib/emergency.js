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
  const res = await db.collection('emergency_pois')
    .orderBy('weight', 'desc')
    .limit(50)
    .get();
  const pois = res.data || [];

  // 清洗电话号码:留数字 / - / 空格视为可拨号,前端用 makePhoneCall 时再做最终清洗
  pois.forEach(p => {
    p.phoneClean = String(p.phone || '').replace(/[^\d]/g, '');
  });

  // 有定位则附加距离 + 排序
  if (userLocation && isFinite(userLocation.latitude) && isFinite(userLocation.longitude)) {
    pois.forEach(p => {
      if (isFinite(p.latitude) && isFinite(p.longitude)) {
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
    pois.sort((a, b) => {
      const ad = a.distanceKm == null ? Infinity : a.distanceKm;
      const bd = b.distanceKm == null ? Infinity : b.distanceKm;
      return ad - bd;
    });
  }

  // 按 category 分组返回(前端按分组渲染卡片)
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
