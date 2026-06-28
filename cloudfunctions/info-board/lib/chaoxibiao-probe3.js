/**
 * chaoxibiao 多日期 URL 变种探针
 *
 * 目标:找到能直接 GET 拉未来日期的 URL 格式
 *
 * 已知:
 *  - https://www.chaoxibiao.net/tides/90.html → 只返回今天
 *  - POST + date 参数被忽略(token 留空)
 *
 * 思路:试主流站点的 URL 命名规则
 */
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Referer': 'https://www.chaoxibiao.net/tides/90.html'
};

// 用 6/29(明天)和 7/01(后续)做测试日期 — 看哪个变种能拉到非今天的数据
const TARGET_DATE = '2026-06-29';
const TARGET_MONTH = '2026-06';
const CANDIDATES = [
  // 直接日期路径
  { name: '/tides/90/2026-06-29.html', url: 'https://www.chaoxibiao.net/tides/90/2026-06-29.html' },
  { name: '/tides/90/20260629.html',  url: 'https://www.chaoxibiao.net/tides/90/20260629.html' },
  { name: '/tides/90-2026-06-29.html', url: 'https://www.chaoxibiao.net/tides/90-2026-06-29.html' },
  // 月历
  { name: '/tides/90/2026-06.html', url: 'https://www.chaoxibiao.net/tides/90/2026-06.html' },
  { name: '/tides/90/202606.html',  url: 'https://www.chaoxibiao.net/tides/90/202606.html' },
  { name: '/month/90/2026-06.html', url: 'https://www.chaoxibiao.net/month/90/2026-06.html' },
  // 子目录尝试
  { name: '/tides/90/2026/06/29.html', url: 'https://www.chaoxibiao.net/tides/90/2026/06/29.html' },
  // 查询参数
  { name: '?date=2026-06-29', url: 'https://www.chaoxibiao.net/tides/90.html?date=2026-06-29' },
  { name: '?d=2026-06-29',    url: 'https://www.chaoxibiao.net/tides/90.html?d=2026-06-29' },
  { name: '?day=29&month=6', url: 'https://www.chaoxibiao.net/tides/90.html?day=29&month=6&year=2026' },
  // tide/ 而不是 tides/
  { name: '/tide/90/2026-06-29.html', url: 'https://www.chaoxibiao.net/tide/90/2026-06-29.html' },
  // 整体首页 — 有时主页含未来 7 天预览链接
  { name: '主页(找未来 N 天预览链接)', url: 'https://www.chaoxibiao.net/tides/90.html', extractFull: true }
];

async function probeAll() {
  const results = [];
  // 先拉今天的数据作为对照基准
  let baseline = null;
  try {
    const r = await axios.get('https://www.chaoxibiao.net/tides/90.html', {
      headers: HEADERS,
      timeout: 12000,
      responseType: 'text',
      transformResponse: [d => d]
    });
    baseline = {
      size: String(r.data || '').length,
      date: extractDate(String(r.data || ''))
    };
  } catch (e) {}

  for (const c of CANDIDATES) {
    try {
      const res = await axios.get(c.url, {
        headers: HEADERS,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [d => d]
      });
      const body = String(res.data || '');
      const size = body.length;
      const dateInPage = extractDate(body);
      const snippet = c.extractFull
        ? extractDateLinks(body)   // 主页特殊处理:提取所有日期链接
        : body.slice(0, 600);

      results.push({
        name: c.name,
        url: c.url,
        status: res.status,
        size,
        dateInPage,
        sameAsBaseline: baseline && size === baseline.size && dateInPage === baseline.date,
        isTargetDate: dateInPage === TARGET_DATE,
        snippet
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

  return {
    baseline,
    target: TARGET_DATE,
    note: '若某 url 的 dateInPage === target,表示该 URL 能拉到目标日期(非今天)的数据',
    tried: results
  };
}

function extractDate(html) {
  const m = html.match(/(\d{4}-\d{2}-\d{2})\s*农历/);
  return m ? m[1] : null;
}

/** 从主页提取所有 a 标签里含日期的链接(可能有"未来 N 天预览"链接) */
function extractDateLinks(html) {
  // 找形如 href="..." 含日期字符串的 a 标签
  const matches = [];
  const re = /<a[^>]+href="([^"]*?(?:\d{4}-?\d{2}-?\d{2}|\d{8}|\d{6})[^"]*)"[^>]*>([^<]{0,30})<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null && matches.length < 30) {
    matches.push({ href: m[1], text: m[2].trim() });
  }
  return matches;
}

module.exports = { probeAll };
