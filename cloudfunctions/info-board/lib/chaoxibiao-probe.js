/**
 * 潮汐数据源 · 第三轮探针 · chaoxibiao.net
 *
 * 这个站(https://www.chaoxibiao.net)是用户提供的真实数据源,
 * 数据精度比谐波公式高很多。如果云函数能访问,本地谐波就可以退役了。
 *
 * 探针目标:
 *  A. 主页能否访问
 *  B. 90 号站详情页(汕头/南澳)能否拉到完整 HTML
 *  C. 是否有 API/JSON 接口(开发者工具可能能看到)
 *  D. 内容是否含潮汐时刻 + 潮高
 */
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CANDIDATES = [
  {
    name: 'chaoxibiao 主页',
    url: 'https://www.chaoxibiao.net/',
    headers: { 'User-Agent': UA }
  },
  {
    name: 'chaoxibiao · 90 号站详情页(汕头/南澳)',
    url: 'https://www.chaoxibiao.net/tides/90.html',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.chaoxibiao.net/' },
    extractFull: true  // 拉完整内容看结构
  },
  {
    name: 'chaoxibiao · 猜 API /api/tides/90',
    url: 'https://www.chaoxibiao.net/api/tides/90',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.chaoxibiao.net/tides/90.html' }
  },
  {
    name: 'chaoxibiao · 猜 JSON /tides/90.json',
    url: 'https://www.chaoxibiao.net/tides/90.json',
    headers: { 'User-Agent': UA }
  },
  {
    name: 'chaoxibiao · 猜数据接口 /data/90',
    url: 'https://www.chaoxibiao.net/data/90',
    headers: { 'User-Agent': UA }
  },
  {
    name: 'chaoxibiao · 站点列表',
    url: 'https://www.chaoxibiao.net/tides/',
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
        responseType: 'text',
        transformResponse: [data => data]
      });
      const body = typeof res.data === 'string' ? res.data : String(res.data || '');
      const snippetLen = c.extractFull ? 8000 : 1200;
      results.push({
        name: c.name,
        url: c.url,
        status: res.status,
        contentType: res.headers['content-type'] || '',
        size: body.length,
        snippet: body.slice(0, snippetLen),
        signals: {
          hasTideTime: /\d{2}:\d{2}/.test(body),
          hasHeight: /\d+\s*cm|高潮|低潮|满潮|干潮|潮高|潮位/i.test(body),
          hasJson: body.trim().startsWith('{') || body.trim().startsWith('['),
          hasTable: /<table/i.test(body),
          // 提取所有 "HH:MM" 形式的时间戳计数,>10 个说明可能是潮汐时刻表
          timeCount: (body.match(/\d{1,2}:\d{2}/g) || []).length,
          // 类似 215cm / 1.44m 这种潮高数字计数
          heightCount: (body.match(/\d{1,3}cm|\d+\.\d+m/g) || []).length
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
