/**
 * AMap 路径规划封装(驾车 / 步行)
 * 文档:
 *  - driving: https://lbs.amap.com/api/webservice/guide/api/direction#driving
 *  - walking: https://lbs.amap.com/api/webservice/guide/api/direction#walk
 *
 * KEY 从环境变量 AMAP_KEY 读取;未配置时 throw,由 route-syncer 兜底为直线段。
 * 与 spot-sync/lib/amap.js 共用同一 KEY,但独立模块避免循环依赖。
 *
 * QPS 节流:免费版 3 QPS,留 25% 余量取 400ms 间隔。
 */
const axios = require('axios');

const BASE = 'https://restapi.amap.com';
const QPS_INTERVAL = 400; // ms
let lastCallAt = 0;

function getKey() {
  const key = process.env.AMAP_KEY;
  if (!key) throw new Error('AMAP_KEY 环境变量未配置');
  return key;
}

async function throttle() {
  const now = Date.now();
  const wait = lastCallAt + QPS_INTERVAL - now;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();
}

async function request(path, params) {
  await throttle();
  const url = `${BASE}${path}`;
  const fullParams = { key: getKey(), ...params };
  const res = await axios.get(url, { params: fullParams, timeout: 12000 });
  // AMap direction 接口 status="1" 才是成功;infocode "10003" = 配额超限
  if (res.data.status && res.data.status !== '1') {
    const err = new Error(`AMap ${path} 失败: ${res.data.info || res.data.infocode}`);
    err.amapCode = res.data.infocode;
    throw err;
  }
  return res.data;
}

/**
 * AMap 返回 path.steps[i].polyline 是 ";" 分隔的 "lng,lat" pairs
 * 例:"117.123,23.456;117.124,23.457;..."
 * 把所有 step 拼成统一的 [[lng, lat], ...] 数组
 */
function parsePolyline(path) {
  const points = [];
  const steps = (path && path.steps) || [];
  for (const step of steps) {
    const raw = step.polyline || '';
    const pairs = raw.split(';');
    for (const pair of pairs) {
      const [lngStr, latStr] = pair.split(',');
      const lng = Number(lngStr);
      const lat = Number(latStr);
      if (isFinite(lng) && isFinite(lat)) {
        // 去重:同一坐标相邻出现时跳过,减小载荷
        const last = points[points.length - 1];
        if (!last || last[0] !== lng || last[1] !== lat) {
          points.push([lng, lat]);
        }
      }
    }
  }
  return points;
}

/**
 * 驾车路径
 * @param {{lng,lat}} origin
 * @param {{lng,lat}} destination
 * @returns {Promise<{distance:number, duration:number, points:Array<[lng,lat]>}>}
 *   distance(m), duration(s)
 */
async function driving(origin, destination) {
  const data = await request('/v3/direction/driving', {
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    extensions: 'all', // 返回 steps.polyline
    strategy: '0',     // 速度最快
    output: 'JSON'
  });
  const path = data.route && data.route.paths && data.route.paths[0];
  if (!path) throw new Error('AMap driving 返回空 paths');
  return {
    distance: Number(path.distance),
    duration: Number(path.duration),
    points: parsePolyline(path)
  };
}

/**
 * 步行路径(单段最长 100km,超出 AMap 会拒绝)
 */
async function walking(origin, destination) {
  const data = await request('/v3/direction/walking', {
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    output: 'JSON'
  });
  const path = data.route && data.route.paths && data.route.paths[0];
  if (!path) throw new Error('AMap walking 返回空 paths');
  return {
    distance: Number(path.distance),
    duration: Number(path.duration),
    points: parsePolyline(path)
  };
}

module.exports = { driving, walking, parsePolyline };
