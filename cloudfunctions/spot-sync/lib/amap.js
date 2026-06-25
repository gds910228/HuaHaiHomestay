/**
 * 高德 Web 服务 API 封装
 * - 文档:https://lbs.amap.com/api/webservice/guide/api/newpoisearch
 * - KEY 从环境变量 AMAP_KEY 读取,未配置时所有方法 throw
 * - 内置 50ms QPS 节流,避免触发免费版限速
 */
const axios = require('axios');

const BASE = 'https://restapi.amap.com';
const QPS_INTERVAL = 50; // ms
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
  try {
    const res = await axios.get(url, { params: fullParams, timeout: 10000 });
    if (res.data.status && res.data.status !== '1') {
      // POI v2 用 status,direction 用 status 也是 "1" = 成功
      throw new Error(`AMap ${path} 失败: ${res.data.info || res.data.infocode}`);
    }
    return res.data;
  } catch (err) {
    if (err.response) {
      throw new Error(`AMap ${path} HTTP ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 200)}`);
    }
    throw err;
  }
}

/**
 * POI 检索 v2
 * 文档:https://lbs.amap.com/api/webservice/guide/api/newpoisearch#text
 * @param {Object} opts
 * @param {string} opts.keywords  关键字,如 "南澳岛景点"
 * @param {string} [opts.types]   POI 类型代码,如 "风景名胜"
 * @param {string} [opts.region]  行政区限定 adcode,南澳 440515
 * @param {number} [opts.pageSize=25] 每页条数(v2 最大 25)
 * @param {number} [opts.maxPages=3]  最大翻页数
 * @returns {Promise<Array>}  POI 数组,每项含 id/name/location/address/...
 */
async function searchPOI({ keywords, types, region, pageSize = 25, maxPages = 3 }) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await request('/v5/place/text', {
      keywords,
      types,
      region,
      city_limit: region ? 'true' : undefined,
      page_size: pageSize,
      page_num: page,
      output: 'JSON'
    });
    const pois = data.pois || [];
    all.push(...pois);
    if (pois.length < pageSize) break; // 没有下一页
  }
  return all;
}

/**
 * 步行路径规划
 * 文档:https://lbs.amap.com/api/webservice/guide/api/direction#walk
 * @param {{lng:number,lat:number}} origin
 * @param {{lng:number,lat:number}} destination
 * @returns {Promise<{distance:number, duration:number}>}  distance(m), duration(s)
 *   超出 100km 高德会拒绝,捕获并返回 null
 */
async function walkingDirection(origin, destination) {
  try {
    const data = await request('/v3/direction/walking', {
      origin: `${origin.lng},${origin.lat}`,
      destination: `${destination.lng},${destination.lat}`,
      output: 'JSON'
    });
    const path = data.route && data.route.paths && data.route.paths[0];
    if (!path) return null;
    return {
      distance: Number(path.distance),
      duration: Number(path.duration)
    };
  } catch (err) {
    console.warn('[amap] walking failed:', err.message);
    return null; // 不让单点失败影响全局同步
  }
}

/**
 * 逆地理编码 - 补全 adcode / township / formatted_address
 * 文档:https://lbs.amap.com/api/webservice/guide/api/georegeo
 */
async function regeo({ lng, lat }) {
  try {
    const data = await request('/v3/geocode/regeo', {
      location: `${lng},${lat}`,
      extensions: 'base',
      output: 'JSON'
    });
    return data.regeocode || null;
  } catch (err) {
    console.warn('[amap] regeo failed:', err.message);
    return null;
  }
}

module.exports = { searchPOI, walkingDirection, regeo };
