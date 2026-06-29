// pages/info/index.js
// 实用信息仪表盘:天气 + 活动评分 + 潮汐曲线 + 渡轮班次 + 应急 POI
const { calcActivityScore } = require('../../utils/marine');
const { drawTideChart } = require('../../utils/tide-chart');

const CACHE_KEY = 'info_board_cache_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

Page({
  data: {
    // ===== 总状态 =====
    isOffline: false,
    cachedAt: null,            // 缓存时间戳(展示"数据更新于 N 分钟前")
    cachedAtDisplay: '',       // cachedAt 派生的相对/绝对时间字符串

    // ===== 天气 =====
    weather: null,             // { now, forecast7d, sourceSpot, updatedAt }
    weatherDisplay: null,      // 派生:{ tempStr, summary, humidityStr, ... }
    weatherLoading: true,
    weatherError: '',

    // ===== 活动评分 =====
    scores: { beach: null, sailing: null, hike: null, photo: null },
    scoreItems: [],            // [{ key, label, emoji, value, stars }]

    // ===== 潮汐 =====
    tide: null,
    tideLoading: true,
    tideError: '',
    tideKeyTimes: [],          // [{ time, height, type, typeLabel }]

    // ===== 渡轮 =====
    ferries: null,             // [{ route, toIsland, toMainland, prices, contacts, tips, ... }]
    ferriesLoading: true,
    ferriesError: '',
    ferryTab: 'schedule',      // 'schedule' | 'price' | 'contact'

    // ===== 应急 POI =====
    emergency: null,
    emergencyLoading: true,
    emergencyError: '',
    emergencyCategoryOrder: ['hospital', 'police', 'gas', 'general', 'travel-service', 'travel-agency'],
    emergencyCategoryLabels: {
      hospital: '🏥 医院',
      police: '👮 派出所',
      gas: '⛽ 加油',
      general: '🆘 紧急救援',
      'travel-service': '📞 旅游服务',
      'travel-agency': '🏢 旅行社'
    },
    activeEmergencyCat: 'hospital',
    hasUserLocation: false
  },

  onLoad() {
    this.hydrateFromCache();
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll({ force: true });
  },

  /** 24h 缓存:启动时先渲染缓存,再走网络 */
  hydrateFromCache() {
    try {
      const cached = wx.getStorageSync(CACHE_KEY);
      if (cached && cached.data && Date.now() - cached.ts < CACHE_TTL) {
        this.applyAll(cached.data, { fromCache: true });
        this.setData({ cachedAt: cached.ts, cachedAtDisplay: formatCachedAt(cached.ts) });
      }
    } catch (e) { /* ignore */ }
  },

  /** 拉取全部数据(并发) */
  async loadAll(opts) {
    const force = opts && opts.force;
    this.setData({
      weatherLoading: true, tideLoading: true,
      ferriesLoading: true, emergencyLoading: true,
      weatherError: '', tideError: '', ferriesError: '', emergencyError: ''
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'info-board',
        data: { type: 'all' }
      });
      if (!res.result || !res.result.success) {
        throw new Error(res.result?.errMsg || '加载失败');
      }
      const data = res.result.data || {};
      wx.setStorageSync(CACHE_KEY, { data, ts: Date.now() });
      this.applyAll(data, { fromCache: false });
      this.setData({ isOffline: false, cachedAt: Date.now(), cachedAtDisplay: formatCachedAt(Date.now()) });

      // 异步绘制潮汐曲线(等数据 setData 后下一帧)
      wx.nextTick(() => this.renderTideChart());
    } catch (err) {
      console.error('[info] 加载失败', err);
      // 网络挂了,如果有缓存数据保留 + 提示
      if (this.data.weather || this.data.tide || this.data.ferries || this.data.emergency) {
        this.setData({ isOffline: true });
        wx.showToast({
          title: force ? '刷新失败,显示离线数据' : '当前为离线数据',
          icon: 'none', duration: 2200
        });
      } else {
        // 缓存也无 → 每模块标记错误
        this.setData({
          weatherError: '加载失败,请下拉重试',
          tideError: '加载失败',
          ferriesError: '加载失败',
          emergencyError: '加载失败',
          weatherLoading: false, tideLoading: false,
          ferriesLoading: false, emergencyLoading: false
        });
      }
    } finally {
      if (force) wx.stopPullDownRefresh();
    }
  },

  /** 把 cloud 返回的聚合数据装入 setData,每个模块独立错误标记 */
  applyAll(data, opts) {
    const errors = (data && data.errors) || [];
    const errMap = {};
    errors.forEach(e => { errMap[e.module] = e.errMsg; });

    // ----- 天气 -----
    const weather = data.weather;
    const weatherDisplay = weather && weather.now ? buildWeatherDisplay(weather) : null;
    this.setData({
      weather,
      weatherDisplay,
      weatherLoading: false,
      weatherError: errMap.weather || (!weather ? '天气数据暂未同步' : '')
    });

    // ----- 潮汐 -----
    const tide = data.tide;
    const tideKeyTimes = tide && Array.isArray(tide.todayKeyTimes)
      ? tide.todayKeyTimes.map(k => ({
          ...k,
          typeLabel: k.type === 'high' ? '高潮' : '低潮',
          typeIcon: k.type === 'high' ? '▲' : '▼'
        }))
      : [];
    this.setData({
      tide,
      tideKeyTimes,
      tideLoading: false,
      tideError: errMap.tide || (!tide ? '潮汐数据未配置' : '')
    });

    // ----- 渡轮 -----
    const ferries = data.ferries;
    this.setData({
      ferries: Array.isArray(ferries) ? ferries : [],
      ferriesLoading: false,
      ferriesError: errMap.ferries || (!ferries || ferries.length === 0 ? '暂无班次数据' : '')
    });

    // ----- 应急 POI -----
    const emergency = data.emergency;
    this.setData({
      emergency,
      emergencyLoading: false,
      emergencyError: errMap.emergency || '',
      hasUserLocation: emergency && emergency.hasLocation
    });

    // ----- 活动评分 -----
    this.recomputeScores();
  },

  /** 基于 weather + tide 计算 4 项活动评分 */
  recomputeScores() {
    const w = this.data.weather && this.data.weather.now;
    const t = this.data.tide;
    if (!w && !t) {
      this.setData({
        scoreItems: [
          { key: 'beach', label: '赶海', emoji: '🦀', value: null, stars: [] },
          { key: 'sailing', label: '出海', emoji: '⛵', value: null, stars: [] },
          { key: 'hike', label: '登山', emoji: '🥾', value: null, stars: [] },
          { key: 'photo', label: '摄影', emoji: '📷', value: null, stars: [] }
        ]
      });
      return;
    }

    const weatherInput = {
      text: (w && w.text) || '',
      temp: w && w.temp != null ? Number(w.temp) : null,
      windScale: w && w.windScale != null ? Number(w.windScale) : null,
      uvIndex: this.data.weather && this.data.weather.forecast7d && this.data.weather.forecast7d[0]
        ? Number(this.data.weather.forecast7d[0].uvIndex)
        : null
    };
    const tideInput = t ? {
      currentHeight: t.currentHeight,
      currentTrend: t.currentTrend
    } : null;

    const hour = new Date().getHours();
    const scores = calcActivityScore(weatherInput, tideInput, hour);

    const meta = [
      { key: 'beach', label: '赶海', emoji: '🦀' },
      { key: 'sailing', label: '出海', emoji: '⛵' },
      { key: 'hike', label: '登山', emoji: '🥾' },
      { key: 'photo', label: '摄影', emoji: '📷' }
    ];
    const scoreItems = meta.map(m => {
      const v = scores[m.key];
      return {
        ...m,
        value: v,
        valueDisplay: v == null ? '--' : v.toFixed(1),
        stars: buildStarArray(v)
      };
    });
    this.setData({ scores, scoreItems });
  },

  /** 绘制 canvas 潮汐曲线(在 setData 后 nextTick 调用) */
  renderTideChart() {
    if (!this.data.tide || !Array.isArray(this.data.tide.heights) || this.data.tide.heights.length < 2) return;

    const query = wx.createSelectorQuery().in(this);
    query.select('#tide-canvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        console.warn('[info] 找不到 tide-canvas,无法绘制');
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio || 2;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);

      drawTideChart(ctx, res[0].width, res[0].height, {
        heights: this.data.tide.heights,
        extremes: this.data.tide.extremes
      });
    });
  },

  // ===== 模块级重试 =====
  async retryModule(e) {
    const mod = e.currentTarget.dataset.module;
    this.setData({ [`${mod}Loading`]: true, [`${mod}Error`]: '' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'info-board',
        data: { type: mod, userLocation: mod === 'emergency' && this.data.hasUserLocation
          ? (this._lastLocation || undefined) : undefined }
      });
      if (!res.result || !res.result.success) throw new Error(res.result?.errMsg || '加载失败');
      const single = { [mod]: res.result.data, errors: [] };
      this.applyAll({ ...single }, { fromCache: false });
      if (mod === 'tide') wx.nextTick(() => this.renderTideChart());
    } catch (err) {
      this.setData({ [`${mod}Loading`]: false, [`${mod}Error`]: err.message || '加载失败' });
    }
  },

  // ===== 渡轮 Tab 切换 =====
  selectFerryTab(e) {
    this.setData({ ferryTab: e.currentTarget.dataset.tab });
  },

  // ===== 应急 POI 切换分类 =====
  selectEmergencyCat(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ activeEmergencyCat: cat });
  },

  // ===== "用我的位置排序" =====
  async useMyLocation() {
    wx.getFuzzyLocation({
      success: async (loc) => {
        this._lastLocation = { latitude: loc.latitude, longitude: loc.longitude };
        try {
          const res = await wx.cloud.callFunction({
            name: 'info-board',
            data: { type: 'emergency', userLocation: this._lastLocation }
          });
          if (res.result && res.result.success) {
            this.setData({
              emergency: res.result.data,
              hasUserLocation: true
            });
            wx.showToast({ title: '已按距离排序', icon: 'success' });
          }
        } catch (e) {
          wx.showToast({ title: '排序失败,请重试', icon: 'none' });
        }
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') > -1) return; // 主动取消不提示
        if (msg.indexOf('auth') > -1) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中允许小程序使用位置信息',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); }
          });
        } else {
          wx.showToast({ title: '定位失败', icon: 'none' });
        }
      }
    });
  },

  // ===== 拨打电话 =====
  callPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({
      phoneNumber: String(phone),
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') > -1) return;
        wx.showToast({ title: '拨号失败', icon: 'none' });
      }
    });
  },

  // ===== 长按复制电话 =====
  copyPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.setClipboardData({
      data: String(phone),
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  goHome() { wx.switchTab({ url: '/pages/home/index' }); },

  onShareAppMessage() {
    return {
      title: '南澳岛实时信息 · 天气 · 潮汐 · 渡轮 - 画海民宿',
      path: '/pages/info/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '南澳岛实时信息',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});

// ---- 派生工具 ----

/**
 * 缓存时间戳 → 人类可读时间
 * - < 60s    : "刚刚"
 * - < 60min  : "N 分钟前"
 * - < 24h    : "N 小时前"
 * - 今年     : "M月D日 HH:mm"
 * - 跨年     : "YYYY/M/D HH:mm"
 */
function formatCachedAt(ts) {
  if (!ts || typeof ts !== 'number' || !isFinite(ts)) return '';
  const now = Date.now();
  const diff = now - ts;
  if (diff < 0) return ''; // 异常时钟,直接不显示
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const d = new Date(ts);
  const now_d = new Date(now);
  const pad = n => (n < 10 ? '0' + n : '' + n);
  if (d.getFullYear() === now_d.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildWeatherDisplay(weather) {
  const now = weather.now || {};
  return {
    tempStr: now.temp != null ? `${now.temp}°` : '--',
    text: now.text || '',
    summary: [now.text, now.windDir && (now.windDir + ' ' + (now.windScale || '?') + ' 级')]
      .filter(Boolean).join(' · '),
    humidityStr: now.humidity != null ? `${now.humidity}%` : '',
    windScale: now.windScale,
    sourceSpot: weather.sourceSpot || '',
    updatedAt: weather.updatedAt
      ? new Date(weather.updatedAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' })
      : '',
    emoji: weatherCodeToEmoji(now.icon, now.text)
  };
}

function decorateFerry(f) {
  // 已废弃:新 schema 由云函数 ferries.js 派生 toIsland/toMainland + nextIdx,前端直接用
  return f;
}

function buildStarArray(score) {
  // 5 个星位,每个为 'full' | 'half' | 'empty'
  if (score == null) return [];
  const arr = [];
  for (let i = 1; i <= 5; i++) {
    if (score >= i) arr.push('full');
    else if (score >= i - 0.5) arr.push('half');
    else arr.push('empty');
  }
  return arr;
}

/** QWeather icon code → emoji(从 spot 页移植) */
function weatherCodeToEmoji(code, text) {
  const c = String(code || '').trim();
  if (c) {
    if (c === '100') return '☀️';
    if (c === '150') return '🌙';
    if (c === '101' || c === '102' || c === '103') return '⛅';
    if (c === '151' || c === '152' || c === '153') return '☁️';
    if (c === '104' || c === '154') return '☁️';
    if (c.startsWith('30') && c < '305') return '⛈️';
    if (c.startsWith('3')) return '🌧️';
    if (c.startsWith('4')) return '❄️';
    if (c.startsWith('5')) return '🌫️';
    if (c.startsWith('2')) return '💨';
    if (c === '900') return '🥵';
    if (c === '901') return '🥶';
  }
  const t = String(text || '');
  if (/雷/.test(t)) return '⛈️';
  if (/雨/.test(t)) return '🌧️';
  if (/雪/.test(t)) return '❄️';
  if (/雾|霾/.test(t)) return '🌫️';
  if (/沙|尘/.test(t)) return '💨';
  if (/阴/.test(t)) return '☁️';
  if (/多云|云/.test(t)) return '⛅';
  if (/晴/.test(t)) return '☀️';
  return '🌤️';
}
