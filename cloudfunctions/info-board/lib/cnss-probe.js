/**
 * 潮汐数据源探针
 *
 * 由于本地开发环境无法访问中国域名,先做一个探针,
 * 尝试几个可能的潮汐数据源 URL,把响应状态/内容前 800 字符返回,
 * 让用户在云函数控制台跑一次,根据结果决定能爬哪个源、用什么解析逻辑
 *
 * 调用:{ "type": "probeTideSource" }
 *
 * 候选源(从概率高到低):
 *  1. 中国海事服务网潮汐页(汕头海洋站)
 *  2. 国家海洋预报台
 *  3. 民间潮汐 API(开源项目)
 */
const axios = require('axios');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache'
};

// 候选 URL 列表(每个带注释说明预期内容)
const CANDIDATES = [
  {
    name: '中国海事服务网 · 潮汐页(汕头海洋站)',
    url: 'https://ocean.cnss.com.cn/tideline.html?Loc=area%3Acstg.SHANTOU',
    referer: 'https://ocean.cnss.com.cn/',
    type: 'html'
  },
  {
    name: '中国海事服务网 · 潮汐主页',
    url: 'https://ocean.cnss.com.cn/',
    referer: '',
    type: 'html'
  },
  {
    name: '中国海事服务网 · 域名根',
    url: 'https://www.cnss.com.cn/',
    referer: '',
    type: 'html'
  },
  {
    name: '国家海洋预报台 · 主页',
    url: 'https://www.nmefc.cn/',
    referer: '',
    type: 'html'
  },
  {
    name: '国家海洋信息中心',
    url: 'https://www.nmdis.org.cn/',
    referer: '',
    type: 'html'
  },
  {
    name: '汕头海事局 · 信息公开',
    url: 'http://www.gdmsa.gov.cn/',
    referer: '',
    type: 'html'
  },
  {
    name: '气象局公开数据 · 海洋(测试)',
    url: 'http://www.nmc.cn/publish/marine/tide.html',
    referer: '',
    type: 'html'
  }
];

/**
 * 探测所有候选源,返回响应状态摘要
 * @returns {Promise<{tried: Array<{name,url,status,contentType,size,snippet,errMsg?}>}>}
 */
async function probeAll() {
  const results = [];
  for (const c of CANDIDATES) {
    const headers = { ...BROWSER_HEADERS };
    if (c.referer) headers.Referer = c.referer;
    try {
      const res = await axios.get(c.url, {
        headers,
        timeout: 8000,
        maxRedirects: 5,
        // 关闭 SSL 校验避免老站证书问题(仅探针用)
        httpsAgent: undefined,
        validateStatus: () => true   // 别让 4xx/5xx 自动 throw
      });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const snippet = body.slice(0, 800);
      results.push({
        name: c.name,
        url: c.url,
        status: res.status,
        contentType: res.headers['content-type'] || '',
        size: body.length,
        snippet,
        hasShantou: /汕头|shantou/i.test(body),
        hasTide: /潮汐|高潮|低潮|tide/i.test(body)
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
