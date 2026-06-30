// pages/route/index.js
const CACHE_KEY = 'route_list_cache_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

Page({
  data: {
    category: { id: 'route', name: '南澳玩法', emoji: '🗺️' },
    guides: [],         // 原始数据(已含 totalDistance / polylineSegments)
    filtered: [],       // 经 day + tag 过滤后展示
    loading: false,
    isFirstLoad: true,
    isOffline: false,   // 当前展示的是否为离线缓存

    // day 切换
    daysTabs: [
      { key: 'all', label: '全部' },
      { key: 1, label: '一日游' },
      { key: 2, label: '两日游' },
      { key: 3, label: '三日游' }
    ],
    activeDays: 'all',

    // 标签筛选
    tagOptions: [],
    activeTag: '',
    tagsExpanded: false
  },

  onLoad() {
    // 启动:先吃缓存,再走网络
    this.hydrateFromCache();
    this.loadTagOptions();
    this.loadGuides();
  },

  onShow() {
    // 重新进入页面时刷新数据(标签/收藏可能在别处变更)
    if (!this.data.isFirstLoad) this.loadGuides();
  },

  /** 启动时读 24h 内的缓存先渲染,网络后再覆盖 */
  hydrateFromCache() {
    try {
      const cached = wx.getStorageSync(CACHE_KEY);
      if (cached && cached.data && Date.now() - cached.ts < CACHE_TTL) {
        const decorated = this.decorateGuides(cached.data);
        this.setData({
          guides: decorated,
          filtered: this.applyFilters(decorated),
          isFirstLoad: false
        });
      }
    } catch (e) {
      // 缓存读取失败不阻断
    }
  },

  async loadTagOptions() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: { type: 'getAllTags', category: this.data.category.id }
      });
      if (res.result && res.result.success) {
        this.setData({ tagOptions: res.result.data || [] });
      }
    } catch (err) {
      console.warn('[路线] 加载标签失败', err);
    }
  },

  selectTag(e) {
    const tag = e.currentTarget.dataset.tag || '';
    const activeTag = tag === this.data.activeTag ? '' : tag;
    this.setData({
      activeTag,
      filtered: this.applyFilters(this.data.guides, { activeTag })
    });
  },

  toggleTagsExpanded() {
    this.setData({ tagsExpanded: !this.data.tagsExpanded });
  },

  selectDays(e) {
    const raw = e.currentTarget.dataset.days;
    const activeDays = raw === 'all' ? 'all' : Number(raw);
    this.setData({
      activeDays,
      filtered: this.applyFilters(this.data.guides, { activeDays })
    });
  },

  /** 客户端二次过滤:days + tag */
  applyFilters(guides, override) {
    const activeDays = override && 'activeDays' in override ? override.activeDays : this.data.activeDays;
    const activeTag = override && 'activeTag' in override ? override.activeTag : this.data.activeTag;
    let list = guides;
    if (activeDays !== 'all') {
      list = list.filter(g => Number(g.days || 1) === activeDays);
    }
    if (activeTag) {
      list = list.filter(g => Array.isArray(g.tags) && g.tags.indexOf(activeTag) > -1);
    }
    return list;
  },

  async loadGuides(opts) {
    const force = opts && opts.force;
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getGuides',
          category: this.data.category.id,
          pageSize: 100
        }
      });
      if (res.result && res.result.success) {
        let guides = res.result.data || [];
        guides = guides.filter(g => g.category === 'route');
        guides = guides.filter(g => !g.status || g.status === 'published');
        const decorated = this.decorateGuides(guides);

        wx.setStorageSync(CACHE_KEY, { data: guides, ts: Date.now() });

        this.setData({
          guides: decorated,
          filtered: this.applyFilters(decorated),
          loading: false,
          isFirstLoad: false,
          isOffline: false
        });
      } else {
        throw new Error(res.result?.errMsg || '加载失败');
      }
    } catch (err) {
      console.error('[路线] 加载失败', err);
      this.setData({ loading: false, isFirstLoad: false });
      // 走网络失败,如果当前已有缓存数据就保留 + toast;无数据才提示空
      if (this.data.guides.length > 0) {
        this.setData({ isOffline: true });
        wx.showToast({ title: force ? '刷新失败,已显示离线数据' : '当前为离线数据,请联网获取最新内容', icon: 'none', duration: 2200 });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    } finally {
      if (force) wx.stopPullDownRefresh();
    }
  },

  /** 派生显示字段 + SVG 缩略路径 */
  decorateGuides(guides) {
    return guides.map(g => {
      const hasImages = g.images && g.images.length > 0;
      const firstImage = hasImages ? g.images[0] : '';
      const coverImage = g.cover || firstImage || '';
      const isPlaceholder = coverImage && coverImage.includes('placeholder');

      const waypoints = Array.isArray(g.waypoints) ? g.waypoints : [];
      const segments = Array.isArray(g.polylineSegments) ? g.polylineSegments : [];

      return {
        ...g,
        coverImage,
        hasRealImage: !!coverImage && !isPlaceholder,
        waypointCount: waypoints.length,
        daysLabel: (Number(g.days) || 1) + '日',
        transportLabel: TRANSPORT_LABEL[g.transport] || '驾车',
        distanceDisplay: formatDistance(g.totalDistance),
        durationDisplay: formatDuration(g.totalDuration),
        // SVG 缩略路径:从 segments 抽稀 + 归一化,直接生成完整 data URI 给 image src 用
        miniTrailSrc: buildMiniTrailSrc(segments, waypoints)
      };
    });
  },

  /** 进入详情页 */
  viewGuide(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/route-detail/index?id=${id}` });
  },

  onPullDownRefresh() {
    this.loadGuides({ force: true });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  onShareAppMessage() {
    return {
      title: '南澳岛玩法分享 - 画海民宿',
      path: `/pages/route/index`,
      imageUrl: '/images/logo.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '南澳岛玩法分享 - 画海民宿',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});

const TRANSPORT_LABEL = {
  driving: '驾车',
  walking: '步行',
  mixed: '混合'
};

/** 格式化距离:<1km 显示 m,>=1km 显示 km */
function formatDistance(m) {
  if (!isFinite(Number(m)) || m <= 0) return '';
  const km = m / 1000;
  if (km < 1) return `${Math.round(m)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** 格式化时长:秒 → "Nh / Nh M min / N min";<=0 视为未知 */
function formatDuration(sec) {
  if (!isFinite(Number(sec)) || sec <= 0) return '';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * 把 polylineSegments 转成 SVG path d 属性,viewBox 200x60
 * 抽稀:每段最多 20 个点
 * 归一化:把所有 lng/lat 线性映射到 [10, 190] × [10, 50]
 * 返回:完整 data:image/svg+xml URL,可直接喂给 <image src>
 */
function buildMiniTrailSrc(segments, waypoints) {
  // 收集所有点(优先 segments 内部 points,fallback 用 waypoints 坐标)
  let pts = [];
  if (segments && segments.length > 0) {
    for (const seg of segments) {
      const segPts = Array.isArray(seg.points) ? seg.points : [];
      // 抽稀:每段最多 20 个点
      const stride = Math.max(1, Math.ceil(segPts.length / 20));
      for (let i = 0; i < segPts.length; i += stride) {
        pts.push(segPts[i]);
      }
      if (segPts.length > 0) pts.push(segPts[segPts.length - 1]);
    }
  } else if (waypoints && waypoints.length > 0) {
    pts = waypoints.map(w => [w.longitude, w.latitude]);
  }
  if (pts.length < 2) return '';

  // 计算 bbox
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const p of pts) {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  const dx = maxLng - minLng || 1e-6;
  const dy = maxLat - minLat || 1e-6;
  // viewBox: 200 × 60, 内框 [10, 190] × [10, 50](留 10rpx 边距)
  const innerW = 180, innerH = 40, padX = 10, padY = 10;
  // 保持纵横比,取短轴 scale
  const scale = Math.min(innerW / dx, innerH / dy);
  // 内框内居中
  const renderedW = dx * scale;
  const renderedH = dy * scale;
  const offX = padX + (innerW - renderedW) / 2;
  const offY = padY + (innerH - renderedH) / 2;

  // 纬度大 = 北 = SVG 上方,所以 y 用 (maxLat - lat) 而不是 (lat - minLat)
  const mapped = pts.map(p => [
    offX + (p[0] - minLng) * scale,
    offY + (maxLat - p[1]) * scale
  ]);

  let d = `M ${mapped[0][0].toFixed(1)} ${mapped[0][1].toFixed(1)}`;
  for (let i = 1; i < mapped.length; i++) {
    d += ` L ${mapped[i][0].toFixed(1)} ${mapped[i][1].toFixed(1)}`;
  }
  // 生成完整 SVG;颜色用海藻青(cat-route #3E7A6E)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none" stroke="#3E7A6E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
