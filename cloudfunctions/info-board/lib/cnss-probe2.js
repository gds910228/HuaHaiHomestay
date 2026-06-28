/**
 * 潮汐数据源 · 第二轮深挖探针
 *
 * 基于第一轮探针结果(2026-06-28):
 *  - ocean.cnss.com.cn / gdmsa.gov.cn → DNS 失败,子域已停服
 *  - cnss.com.cn / nmdis.org.cn → 主站可达但无潮汐内容
 *  - **nmc.cn/publish/marine/tide.html** → 200 + 13KB HTML,有潜力
 *  - nmefc.cn → SPA 落地页(2KB),真数据在 XHR API
 *
 * 本轮目标:
 *  A. 抓 nmc.cn 潮汐页完整内容,看是否有可解析的数据
 *  B. 探测 nmefc.cn 可能的 API 路径(SPA 数据接口)
 *  C. 试几个第三方/民间潮汐数据源
 */
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CANDIDATES = [
  // ---- A. NMC 国家气象中心潮汐页 ----
  {
    name: 'NMC · 潮汐主页(完整 HTML)',
    url: 'http://www.nmc.cn/publish/marine/tide.html',
    headers: { 'User-Agent': UA, 'Referer': 'http://www.nmc.cn/' },
    extractFull: true   // 这个返回完整内容(不裁剪 800)
  },
  {
    name: 'NMC · 潮汐 API(猜测 /rest/marine/tide)',
    url: 'http://www.nmc.cn/rest/marine/tide',
    headers: { 'User-Agent': UA, 'Referer': 'http://www.nmc.cn/publish/marine/tide.html' }
  },
  {
    name: 'NMC · 潮汐数据(/f/rest/...)',
    url: 'http://www.nmc.cn/f/rest/marine/tide',
    headers: { 'User-Agent': UA, 'Referer': 'http://www.nmc.cn/publish/marine/tide.html' }
  },
  {
    name: 'NMC · 沿岸预报',
    url: 'http://www.nmc.cn/publish/marine/coastal/SHANTOU.html',
    headers: { 'User-Agent': UA, 'Referer': 'http://www.nmc.cn/publish/marine/tide.html' }
  },

  // ---- B. NMEFC 国家海洋预报台 XHR 接口(猜测) ----
  {
    name: 'NMEFC · /api/data/list',
    url: 'https://www.nmefc.cn/api/data/list',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.nmefc.cn/' }
  },
  {
    name: 'NMEFC · /api/tide/list',
    url: 'https://www.nmefc.cn/api/tide/list',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.nmefc.cn/' }
  },
  {
    name: 'NMEFC · /forecast/api/tide',
    url: 'https://www.nmefc.cn/forecast/api/tide',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.nmefc.cn/' }
  },
  {
    name: 'NMEFC · static/json 探测',
    url: 'https://www.nmefc.cn/static/data/tide.json',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.nmefc.cn/' }
  },

  // ---- C. 民间 / 第三方源 ----
  {
    name: 'Tideschart(海外免费,可能不覆盖中国)',
    url: 'https://www.tideschart.com/China/Guangdong/Shantou/',
    headers: { 'User-Agent': UA }
  },
  {
    name: 'Tide-forecast(海外免费)',
    url: 'https://www.tide-forecast.com/locations/Shantou-China/tides/latest',
    headers: { 'User-Agent': UA }
  }
];

async function probeAll() {
  const results = [];
  for (const c of CANDIDATES) {
    try {
      const res = await axios.get(c.url, {
        headers: c.headers,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
        // 关键:WeChat 云函数默认会对 < 1KB 的 JSON 报错,这里手动指定 responseType 让所有内容都返回 raw
        responseType: 'text',
        transformResponse: [data => data]   // 保留原始字符串
      });
      const body = typeof res.data === 'string' ? res.data : String(res.data || '');
      // NMC 主页要看完整内容,其他截 1500 字符
      const snippetLen = c.extractFull ? 6000 : 1500;
      results.push({
        name: c.name,
        url: c.url,
        status: res.status,
        contentType: res.headers['content-type'] || '',
        size: body.length,
        snippet: body.slice(0, snippetLen),
        signals: {
          hasShantou: /汕头|shantou/i.test(body),
          hasTide: /潮汐|高潮|低潮|潮位|tide|high|low/i.test(body),
          hasJson: body.trim().startsWith('{') || body.trim().startsWith('['),
          hasTable: /<table/i.test(body),
          hasIframe: /<iframe/i.test(body)
        }
      });
    } catch (err) {
      results.push({
        name: c.name,
        url: c.url,
        errMsg: err.message,
        errCode: err.code || ''
      });
    }
  }
  return { tried: results, time: new Date().toISOString() };
}

module.exports = { probeAll };
