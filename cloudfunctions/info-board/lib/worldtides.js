/**
 * WorldTides API 封装
 * 文档:https://www.worldtides.info/apidocs
 * KEY 从环境变量 WORLDTIDES_KEY 读取;未配置时 throw
 *
 * 免费版:100 次调用/月。本项目设计:7 天数据一次拉完写 cache,
 *        理论上一周刷一次 = 4 次/月,7 个海岛位置都用同坐标。
 *
 * 接口返回(简化):
 *   heights: [{ dt:1234567890, date:'2026-06-27T00:00+0800', height:1.23 }, ...]
 *   extremes: [{ dt, date, height, type:'High'|'Low' }, ...]
 */
const axios = require('axios');

const BASE = 'https://www.worldtides.info/api/v3';
const QPS_INTERVAL = 800; // ms,免费版限速宽松,留 1 秒余量
let lastCallAt = 0;

function getKey() {
  const key = process.env.WORLDTIDES_KEY;
  if (!key) throw new Error('WORLDTIDES_KEY 环境变量未配置');
  return key;
}

async function throttle() {
  const now = Date.now();
  const wait = lastCallAt + QPS_INTERVAL - now;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();
}

/**
 * 一次性拉取从 date 开始的 N 天潮汐(heights + extremes)
 * step=900 表示 15 分钟一个数据点
 *
 * @param {{lat:number, lng:number, date:string, days:number}} opts
 *   date 格式:'YYYY-MM-DD'
 * @returns {Promise<{heights:Array, extremes:Array, station:string|null, requestLat:number, requestLon:number}>}
 */
async function fetchTides({ lat, lng, date, days = 7 }) {
  await throttle();
  const params = {
    heights: '',          // 启用 heights 数据
    extremes: '',         // 启用 extremes 数据
    date: date,           // 起始日期
    days: days,           // 天数
    lat: Number(lat).toFixed(4),
    lon: Number(lng).toFixed(4),
    step: 900,            // 15 分钟粒度
    key: getKey()
  };
  try {
    const res = await axios.get(BASE, { params, timeout: 15000 });
    if (res.data && res.data.error) {
      throw new Error(`WorldTides 错误: ${res.data.error}`);
    }
    if (!res.data || (!res.data.heights && !res.data.extremes)) {
      throw new Error('WorldTides 返回空数据');
    }
    return {
      heights: res.data.heights || [],
      extremes: res.data.extremes || [],
      station: res.data.station || null,
      requestLat: res.data.requestLat,
      requestLon: res.data.requestLon
    };
  } catch (err) {
    if (err.response) {
      throw new Error(`WorldTides HTTP ${err.response.status}: ${JSON.stringify(err.response.data || '').slice(0, 200)}`);
    }
    throw err;
  }
}

module.exports = { fetchTides };
