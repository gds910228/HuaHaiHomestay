/**
 * chaoxibiao.net (大鱼潮汐表) 数据抓取与解析
 *
 * 站点:https://www.chaoxibiao.net/tides/90.html (南澳岛云澳)
 * 数据精度:与官方海洋预报一致,潮时误差 ~分钟级
 *
 * 抓取方式:
 *   - GET 默认页 → 拉当天潮汐(HTML 静态渲染)
 *   - POST + date=YYYY-MM-DD → 切换日期(实际有效性需验证)
 *
 * HTML 结构(已实测):
 *   <strong id="test1">2026-06-28 农历五月十四 <span>中潮</span></strong>
 *   <table class="tidesPoint">  (涨退潮时段)
 *     <tr><td>退潮时间</td><td>01:07-05:33</td></tr> ...
 *   </table>
 *   <table class="tidesPoint" style="margin-top:15px;">  (高低潮明细)
 *     <tr><td>高低潮</td><td>满潮</td><td>干潮</td>...</tr>
 *     <tr><td>潮时</td><td>01:07</td><td>05:33</td>...</tr>
 *     <tr><td>潮高(峰值)</td><td>215cm</td><td>144cm</td>...</tr>
 *   </table>
 *   <div class="tidesBenchmark">潮高基准面:在平均海面下158cm</div>
 */
const axios = require('axios');

const URL_BASE = 'https://www.chaoxibiao.net/tides/90.html';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Cache-Control': 'no-cache'
};

/**
 * 拉指定日期的潮汐数据
 * @param {string} [date]  'YYYY-MM-DD',缺省今天
 * @returns {Promise<Object|null>} 解析后的 day 数据,失败返回 null
 */
async function fetchDay(date) {
  const isToday = !date || date === todayYMD();
  let html;
  try {
    if (isToday) {
      // GET 默认页 = 今天
      const res = await axios.get(URL_BASE, {
        headers: BROWSER_HEADERS,
        timeout: 12000,
        responseType: 'text',
        transformResponse: [d => d]
      });
      html = String(res.data || '');
    } else {
      // POST + date 参数切换日期(token 留空,实测能否通)
      const form = new URLSearchParams();
      form.append('date', date);
      form.append('token', '');
      const res = await axios.post(URL_BASE, form.toString(), {
        headers: {
          ...BROWSER_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': URL_BASE,
          'Origin': 'https://www.chaoxibiao.net'
        },
        timeout: 12000,
        responseType: 'text',
        transformResponse: [d => d]
      });
      html = String(res.data || '');
    }
  } catch (err) {
    console.warn('[chaoxibiao] HTTP failed:', err.message);
    return null;
  }
  return parseHtml(html);
}

/**
 * 解析 chaoxibiao HTML
 * @param {string} html
 * @returns {Object|null} { date, lunar, tideType, extremes:[{time,height,type}], benchmark }
 */
function parseHtml(html) {
  if (!html || html.length < 1000) return null;

  // 1. 日期 + 农历 + 潮型
  // 形如:2026-06-28 农历五月十四<span class="cnTides" ...>中潮</span>
  const titleMatch = html.match(/(\d{4}-\d{2}-\d{2})\s*农历([^<]+?)<span[^>]*>([^<]+?)<\/span>/);
  if (!titleMatch) {
    console.warn('[chaoxibiao] 解析失败:找不到日期标题');
    return null;
  }
  const date = titleMatch[1];
  const lunar = titleMatch[2].trim();
  const tideType = titleMatch[3].trim();

  // 2. 提取第二个 tidesPoint 表格(高低潮明细)
  // 用相对粗的 regex,匹配 margin-top:15px 这个特征
  const detailTableMatch = html.match(/<table[^>]*class="tidesPoint"[^>]*margin-top[^>]*>([\s\S]*?)<\/table>/);
  if (!detailTableMatch) {
    console.warn('[chaoxibiao] 解析失败:找不到高低潮表格');
    return null;
  }
  const tableHtml = detailTableMatch[1];

  // 拆 3 行
  const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  if (rows.length < 3) {
    console.warn('[chaoxibiao] 解析失败:表格行数 < 3');
    return null;
  }

  // 每行抽 <td>内容</td>
  const cells = rows.map(r => {
    return (r.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [])
      .map(td => td.replace(/<[^>]*>/g, '').trim());
  });

  // cells[0] = ['高低潮', '满潮'/'干潮', ...]
  // cells[1] = ['潮时',   'HH:MM',   ...]
  // cells[2] = ['潮高(峰值)', 'NNNcm', ...]
  const typeRow = cells[0].slice(1);
  const timeRow = cells[1].slice(1);
  const heightRow = cells[2].slice(1);

  if (typeRow.length !== timeRow.length || timeRow.length !== heightRow.length) {
    console.warn('[chaoxibiao] 表格列数不匹配:', typeRow.length, timeRow.length, heightRow.length);
    return null;
  }

  // 组装 extremes
  const extremes = [];
  for (let i = 0; i < typeRow.length; i++) {
    const type = typeRow[i];     // '满潮' / '干潮'
    const time = timeRow[i];     // 'HH:MM'
    const heightStr = heightRow[i]; // 'NNNcm'
    const heightCm = parseInt(heightStr.replace(/[^\d]/g, ''), 10);
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) continue;
    if (!isFinite(heightCm)) continue;
    extremes.push({
      time,
      height: heightCm / 100,  // cm → m
      type: type.indexOf('满') >= 0 ? 'High' : 'Low'
    });
  }

  if (extremes.length < 2) {
    console.warn('[chaoxibiao] extremes 不足 2 个:', extremes.length);
    return null;
  }

  // 3. 基准面信息
  const benchmarkMatch = html.match(/潮高基准面[::]([^<\n]+)/);
  const benchmark = benchmarkMatch ? benchmarkMatch[1].trim() : '';

  return {
    date,
    lunar,
    tideType,
    extremes,
    benchmark,
    station: '南澳岛(云澳)· 大鱼潮汐表',
    source: 'chaoxibiao'
  };
}

function todayYMD() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 批量拉未来 N 天数据(GET 今天 + POST 其他日期) */
async function fetchDays(startDate, days) {
  const results = [];
  let cursor = startDate || todayYMD();
  for (let i = 0; i < days; i++) {
    const day = await fetchDay(cursor);
    if (day) results.push(day);
    // 间隔 500ms 避免触发反爬
    if (i < days - 1) await new Promise(r => setTimeout(r, 500));
    cursor = addDays(cursor, 1);
  }
  return results;
}

function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00+08:00');
  d.setDate(d.getDate() + n);
  const pad = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

module.exports = { fetchDay, fetchDays, parseHtml };
