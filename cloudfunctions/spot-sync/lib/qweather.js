/**
 * 和风天气开发版 API 封装
 * - 文档:https://dev.qweather.com/docs/api/weather/weather-now/
 * - KEY 从环境变量 QWEATHER_KEY 读取
 * - HOST 优先读 QWEATHER_HOST(2024 年起新注册用户必须用项目专属 host:xxx.re.qweatherapi.com)
 * - 接口返回 gzip,axios 自动解压;若云函数环境异常需手动解压
 * - 单 KEY 免费版限制 1000 次/天,逐景点请求时控制频度
 */
const axios = require('axios');

// 默认 fallback 到老的通用 host(对老用户仍可用);新用户必须设置 QWEATHER_HOST
const DEFAULT_HOST = 'https://devapi.qweather.com';
const QPS_INTERVAL = 100; // ms
let lastCallAt = 0;

function getHost() {
  const h = process.env.QWEATHER_HOST || DEFAULT_HOST;
  // 兼容用户只填 'xxx.re.qweatherapi.com' 不带协议的情况
  if (!/^https?:\/\//i.test(h)) return `https://${h}`;
  return h.replace(/\/+$/, '');
}

function getKey() {
  const key = process.env.QWEATHER_KEY;
  if (!key) throw new Error('QWEATHER_KEY 环境变量未配置');
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
  const url = `${getHost()}/v7${path}`;
  const fullParams = { key: getKey(), ...params };
  try {
    const res = await axios.get(url, {
      params: fullParams,
      timeout: 10000,
      decompress: true,
      headers: { 'Accept-Encoding': 'gzip' }
    });
    if (res.data.code !== '200') {
      // 和风的错误码:https://dev.qweather.com/docs/resource/status-code/
      throw new Error(`QWeather ${path} 业务错误 code=${res.data.code} (200=成功 / 401=KEY错 / 402=配额用尽 / 403=KEY未授权该数据,可能 host 不匹配)`);
    }
    return res.data;
  } catch (err) {
    if (err.response) {
      const bodyStr = typeof err.response.data === 'object'
        ? JSON.stringify(err.response.data)
        : String(err.response.data || '').slice(0, 300);
      // 把 host/body 都打出来,方便定位 host 配置问题
      throw new Error(`QWeather ${path} HTTP ${err.response.status} url=${url.replace(getKey(), '***')} body=${bodyStr}`);
    }
    throw err;
  }
}

/**
 * 当前实时天气
 * @param {number} lng
 * @param {number} lat
 * @returns {Promise<{temp,text,icon,iconUrl,windScale,windDir,humidity,obsTime}|null>}
 */
async function getNow(lng, lat) {
  try {
    const data = await request('/weather/now', {
      location: `${Number(lng).toFixed(2)},${Number(lat).toFixed(2)}`
    });
    const now = data.now || {};
    return {
      temp: now.temp,
      text: now.text,
      icon: now.icon,
      iconUrl: now.icon ? `https://a.hecdn.net/img/sdk/qweather/icon/${now.icon}.svg` : '',
      windScale: now.windScale,
      windDir: now.windDir,
      humidity: now.humidity,
      obsTime: now.obsTime
    };
  } catch (err) {
    console.warn('[qweather] now failed:', err.message);
    return null;
  }
}

/**
 * 未来 7 天天气
 * 历史:旧版本 slice(0, 3) 只取前 3 天给 spot 卡片;现在保留完整 7 天供 info 仪表盘
 * 返回 { forecast7d, forecast3d } 双字段,forecast3d 是 forecast7d 的前 3 天别名
 * 旧消费者(spot 页 weatherBrief / fallback)仍可读 forecast3d 不破
 */
async function get7d(lng, lat) {
  try {
    const data = await request('/weather/7d', {
      location: `${Number(lng).toFixed(2)},${Number(lat).toFixed(2)}`
    });
    const all7d = (data.daily || []).map(d => ({
      date: d.fxDate,
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      textDay: d.textDay,
      iconDay: d.iconDay,
      iconDayUrl: d.iconDay ? `https://a.hecdn.net/img/sdk/qweather/icon/${d.iconDay}.svg` : '',
      windScaleDay: d.windScaleDay,
      windDirDay: d.windDirDay,
      // info 仪表盘多用的字段
      humidity: d.humidity,
      uvIndex: d.uvIndex,
      sunrise: d.sunrise,
      sunset: d.sunset
    }));
    return { forecast7d: all7d, forecast3d: all7d.slice(0, 3) };
  } catch (err) {
    console.warn('[qweather] 7d failed:', err.message);
    return { forecast7d: [], forecast3d: [] };
  }
}

module.exports = { getNow, get7d };
