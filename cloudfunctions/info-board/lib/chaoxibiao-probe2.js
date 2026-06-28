/**
 * chaoxibiao 探针 · 第二版
 *
 * 第一轮发现 90 号详情页 200 / 4546 字节,但 timeCount=0
 * 推断:数据走 XHR 异步加载,或被反爬识别为机器人返回精简版
 *
 * 本轮目标:
 *  A. 拉完整 4546 字节 HTML,看 main 区域到底有啥(是空壳还是有数据)
 *  B. 用更真实的浏览器 headers 重试(Accept-Language / Sec-Fetch-* 等)
 *  C. 探测可能的 XHR / API 端点
 */
const axios = require('axios');

const REALISTIC_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

const CANDIDATES = [
  // A. 完整 90 号详情页 HTML(显示全部)
  {
    name: '90 号详情页 · 完整 HTML',
    url: 'https://www.chaoxibiao.net/tides/90.html',
    headers: REALISTIC_HEADERS,
    fullDump: true
  },
  // 移动版 URL(部分站静态 HTML 只在移动版渲染数据)
  {
    name: '90 号 · m. 子域',
    url: 'https://m.chaoxibiao.net/tides/90.html',
    headers: REALISTIC_HEADERS
  },
  // 加 ?date= 参数(可能数据按日期查)
  {
    name: '90 号 · 带 date 参数',
    url: 'https://www.chaoxibiao.net/tides/90.html?date=2026-06-28',
    headers: REALISTIC_HEADERS
  },
  // B. 猜测 XHR 接口
  {
    name: 'XHR /api/tide?port_id=90',
    url: 'https://www.chaoxibiao.net/api/tide?port_id=90',
    headers: { ...REALISTIC_HEADERS, 'Accept': 'application/json, text/plain, */*', 'Referer': 'https://www.chaoxibiao.net/tides/90.html' }
  },
  {
    name: 'XHR /api/port/90',
    url: 'https://www.chaoxibiao.net/api/port/90',
    headers: { ...REALISTIC_HEADERS, 'Accept': 'application/json, */*' }
  },
  {
    name: 'XHR /tides/data?id=90',
    url: 'https://www.chaoxibiao.net/tides/data?id=90',
    headers: { ...REALISTIC_HEADERS, 'Accept': 'application/json, */*', 'Referer': 'https://www.chaoxibiao.net/tides/90.html' }
  },
  // C. 不带 .html
  {
    name: '90 号 · 无 .html 后缀',
    url: 'https://www.chaoxibiao.net/tides/90',
    headers: REALISTIC_HEADERS
  }
];

async function probeAll() {
  const results = [];
  for (const c of CANDIDATES) {
    try {
      const res = await axios.get(c.url, {
        headers: c.headers,
        timeout: 12000,
        maxRedirects: 5,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [data => data],
        decompress: true
      });
      const body = typeof res.data === 'string' ? res.data : String(res.data || '');
      const snippetLen = c.fullDump ? body.length : 2000;
      results.push({
        name: c.name,
        url: c.url,
        finalUrl: res.request && res.request.res && res.request.res.responseUrl || c.url,
        status: res.status,
        contentType: res.headers['content-type'] || '',
        size: body.length,
        snippet: body.slice(0, snippetLen),
        signals: {
          hasTideTime: /\d{1,2}:\d{2}/.test(body),
          hasHeight: /\d+\s*cm/.test(body),
          hasJson: body.trim().startsWith('{') || body.trim().startsWith('['),
          hasTable: /<table[\s>]/i.test(body),
          hasScript: (body.match(/<script/gi) || []).length,
          timeCount: (body.match(/\d{1,2}:\d{2}/g) || []).length,
          heightCount: (body.match(/\d{1,3}cm/g) || []).length,
          // 找 Ajax/Fetch 端点的踪迹
          hasAjax: /\$\.ajax|fetch\(|XMLHttpRequest|axios/i.test(body)
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
