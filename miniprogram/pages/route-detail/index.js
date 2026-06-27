// pages/route-detail/index.js
const CACHE_KEY_PREFIX = 'route_detail_cache_v1_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// Day 配色:与 spot 主题色一致(暖橘 / 深海青 / 海藻青)
const DAY_COLORS = {
  1: '#E89A3C', // 暖橘
  2: '#1E5266', // 深海青
  3: '#3E7A6E'  // 海藻青
};

Page({
  data: {
    routeId: '',
    route: null,                 // 原始 doc
    loading: true,
    isOffline: false,
    errorMsg: '',

    // 派生展示
    days: 1,
    waypointsByDay: {},          // { 1: [{...}], 2: [...] }
    segmentsByDay: {},           // { 1: [{...}], 2: [...] }
    daySummary: [],              // [{ dayIndex, transportLabel, totalDistance, totalDuration }]
    isFallback: false,           // 是否 polyline 为直线兜底
    showDayFilter: false,        // 是否显示 day 切换 chip(days > 1)
    activeDay: 'all',            // 'all' | 1 | 2 | ...

    // map 数据
    mapMarkers: [],
    mapPolyline: [],
    mapCenter: { latitude: 23.4221, longitude: 117.0234 }, // 南澳岛中心兜底
    mapScale: 11,
    includePoints: []
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      this.setData({ loading: false, errorMsg: '路线 ID 缺失' });
      return;
    }
    this.setData({ routeId: id });
    this.hydrateFromCache(id);
    this.loadRoute(id);
  },

  onPullDownRefresh() {
    this.loadRoute(this.data.routeId, { force: true });
  },

  hydrateFromCache(id) {
    try {
      const cached = wx.getStorageSync(CACHE_KEY_PREFIX + id);
      if (cached && cached.data && Date.now() - cached.ts < CACHE_TTL) {
        this.applyRoute(cached.data);
        this.setData({ loading: false });
      }
    } catch (e) {}
  },

  async loadRoute(id, opts) {
    const force = opts && opts.force;
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: { type: 'getGuideById', id }
      });
      if (res.result && res.result.success && res.result.data) {
        const route = res.result.data;
        wx.setStorageSync(CACHE_KEY_PREFIX + id, { data: route, ts: Date.now() });
        this.applyRoute(route);
        this.setData({ loading: false, isOffline: false, errorMsg: '' });
        // 异步增加 view 数
        wx.cloud.callFunction({ name: 'huahai', data: { type: 'incrementViews', id } }).catch(() => {});
      } else {
        throw new Error(res.result?.errMsg || '路线不存在');
      }
    } catch (err) {
      console.error('[路线详情] 加载失败', err);
      this.setData({ loading: false });
      if (this.data.route) {
        this.setData({ isOffline: true });
        wx.showToast({ title: force ? '刷新失败,已显示离线数据' : '当前为离线数据', icon: 'none', duration: 2200 });
      } else {
        this.setData({ errorMsg: err.message || '加载失败' });
      }
    } finally {
      if (force) wx.stopPullDownRefresh();
      // 设置导航标题
      if (this.data.route && this.data.route.title) {
        wx.setNavigationBarTitle({ title: this.data.route.title });
      }
    }
  },

  /** 把 route 数据转成 UI 字段 */
  applyRoute(route) {
    const waypoints = Array.isArray(route.waypoints) ? route.waypoints : [];
    const segments = Array.isArray(route.polylineSegments) ? route.polylineSegments : [];
    const days = Number(route.days) || 1;
    const isFallback = route.routePlanStatus === 'fallback-straight';

    // 派生轮播图:cover 优先 + images 跟后,去重去空(与 guide-detail 一致的 pattern)
    const displayImages = [];
    const seen = new Set();
    const pushIf = (url) => {
      if (!url) return;
      if (seen.has(url)) return;
      seen.add(url);
      displayImages.push(url);
    };
    pushIf(route.cover);
    (route.images || []).forEach(pushIf);

    // 按 day 分组 waypoints / segments
    const waypointsByDay = {};
    const segmentsByDay = {};
    waypoints.forEach((w, idx) => {
      const d = Number(w.dayIndex) || 1;
      if (!waypointsByDay[d]) waypointsByDay[d] = [];
      waypointsByDay[d].push({
        ...w,
        index: idx,
        stayDisplay: formatStay(w.stayMin)
      });
    });
    segments.forEach(seg => {
      const d = Number(seg.dayIndex) || 1;
      if (!segmentsByDay[d]) segmentsByDay[d] = [];
      segmentsByDay[d].push({
        ...seg,
        distanceDisplay: formatDistance(seg.distance),
        durationDisplay: formatDuration(seg.duration),
        modeLabel: TRANSPORT_LABEL[seg.mode] || '驾车'
      });
    });

    // 每天小计
    const daySummary = Object.keys(waypointsByDay)
      .sort((a, b) => Number(a) - Number(b))
      .map(d => {
        const segs = segmentsByDay[d] || [];
        const dist = segs.reduce((s, x) => s + (Number(x.distance) || 0), 0);
        const dura = segs.reduce((s, x) => s + (x.duration > 0 ? x.duration : 0), 0);
        return {
          dayIndex: Number(d),
          transportLabel: segs.length > 0 ? (TRANSPORT_LABEL[segs[0].mode] || '驾车') : '驾车',
          distanceDisplay: formatDistance(dist),
          durationDisplay: formatDuration(dura),
          color: DAY_COLORS[d] || DAY_COLORS[1]
        };
      });

    // 生成 map markers + polyline
    const { markers, polyline, includePoints, center } = this.buildMapData(waypoints, segments, days, this.data.activeDay);

    this.setData({
      route: {
        ...route,
        displayImages,
        totalDistanceDisplay: formatDistance(route.totalDistance),
        totalDurationDisplay: formatDuration(route.totalDuration),
        transportLabel: TRANSPORT_LABEL[route.transport] || '驾车',
        waypointCount: waypoints.length
      },
      days,
      waypointsByDay,
      segmentsByDay,
      daySummary,
      isFallback,
      showDayFilter: days > 1,
      mapMarkers: markers,
      mapPolyline: polyline,
      includePoints,
      mapCenter: center || this.data.mapCenter
    });
  },

  /** 重算 map markers + polyline,支持 activeDay 过滤 */
  buildMapData(waypoints, segments, days, activeDay) {
    const filterDay = activeDay === 'all' ? null : Number(activeDay);

    // markers
    const markers = [];
    waypoints.forEach((w, idx) => {
      const d = Number(w.dayIndex) || 1;
      if (filterDay !== null && d !== filterDay) return;
      const color = DAY_COLORS[d] || DAY_COLORS[1];
      // 编号:每个 day 内独立编号(1,2,3...)更直观
      const seqInDay = waypoints
        .filter(x => (Number(x.dayIndex) || 1) === d)
        .findIndex(x => x === w) + 1;
      markers.push({
        id: idx,
        latitude: Number(w.latitude),
        longitude: Number(w.longitude),
        title: w.name,
        width: 30,
        height: 30,
        // 自定义编号气泡(callout)
        callout: {
          content: `${seqInDay}. ${w.name}`,
          color: '#FFFFFF',
          fontSize: 12,
          borderRadius: 8,
          bgColor: color,
          padding: 6,
          display: 'BYCLICK',
          textAlign: 'center'
        },
        label: {
          content: String(seqInDay),
          color: '#FFFFFF',
          fontSize: 13,
          bgColor: color,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          padding: 4,
          anchorX: -10,
          anchorY: -34,
          textAlign: 'center'
        }
      });
    });

    // polyline:按 day + segment 拆;同 day 内多段合并为一条 polyline 视觉更连贯
    const polyline = [];
    const segByDay = {};
    segments.forEach(seg => {
      const d = Number(seg.dayIndex) || 1;
      if (filterDay !== null && d !== filterDay) return;
      if (!segByDay[d]) segByDay[d] = [];
      segByDay[d].push(seg);
    });
    Object.keys(segByDay).forEach(d => {
      const segs = segByDay[d];
      const color = DAY_COLORS[d] || DAY_COLORS[1];
      // 按 fromIdx 排序保证连续
      segs.sort((a, b) => (a.fromIdx || 0) - (b.fromIdx || 0));
      const points = [];
      segs.forEach(seg => {
        const segPts = Array.isArray(seg.points) ? seg.points : [];
        segPts.forEach(p => {
          if (Array.isArray(p) && p.length === 2) {
            const last = points[points.length - 1];
            if (!last || last.longitude !== p[0] || last.latitude !== p[1]) {
              points.push({ longitude: p[0], latitude: p[1] });
            }
          }
        });
      });
      if (points.length >= 2) {
        polyline.push({
          points,
          color: color,
          width: 5,
          arrowLine: true,
          dottedLine: false
        });
      }
    });

    // includePoints:用于 map 自动缩放包含所有点
    const includePoints = markers.map(m => ({ latitude: m.latitude, longitude: m.longitude }));
    let center = null;
    if (includePoints.length > 0) {
      const sumLat = includePoints.reduce((s, p) => s + p.latitude, 0);
      const sumLng = includePoints.reduce((s, p) => s + p.longitude, 0);
      center = {
        latitude: sumLat / includePoints.length,
        longitude: sumLng / includePoints.length
      };
    }

    return { markers, polyline, includePoints, center };
  },

  /** 切换 Day 过滤 */
  selectDay(e) {
    const raw = e.currentTarget.dataset.day;
    const activeDay = raw === 'all' ? 'all' : Number(raw);
    this.setData({ activeDay });
    if (this.data.route) {
      const waypoints = this.data.route.waypoints || [];
      const segments = this.data.route.polylineSegments || [];
      const { markers, polyline, includePoints, center } = this.buildMapData(waypoints, segments, this.data.days, activeDay);
      this.setData({
        mapMarkers: markers,
        mapPolyline: polyline,
        includePoints,
        mapCenter: center || this.data.mapCenter
      });
    }
  },

  /** 点击轮播图全屏预览 */
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    const list = Array.isArray(urls) && urls.length ? urls : [url];
    wx.previewImage({ current: url, urls: list });
  },

  /** 单点导航 → 微信内置地图 */
  navigateTo(e) {
    const { latitude, longitude, name, address } = e.currentTarget.dataset;
    if (!latitude || !longitude) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude: Number(latitude),
      longitude: Number(longitude),
      name,
      address: address || name
    });
  },

  /** 导航到下一站:取定位 → 找最近 waypoint → 跳到其后一个 */
  navigateToNext() {
    const wps = (this.data.route && this.data.route.waypoints) || [];
    if (wps.length < 2) {
      wx.showToast({ title: '路线点位不足', icon: 'none' });
      return;
    }
    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        // 找最近 waypoint
        let nearestIdx = 0;
        let nearestKm = Infinity;
        wps.forEach((w, i) => {
          const km = haversineKm(loc.latitude, loc.longitude, Number(w.latitude), Number(w.longitude));
          if (km < nearestKm) { nearestKm = km; nearestIdx = i; }
        });
        // 下一站 = 最近的后一个;如果已经到最后一个,就导航到最后一个本身
        const target = wps[nearestIdx + 1] || wps[nearestIdx];
        wx.openLocation({
          latitude: Number(target.latitude),
          longitude: Number(target.longitude),
          name: target.name,
          address: target.name
        });
      },
      fail: (err) => {
        console.warn('[路线详情] getLocation 失败', err);
        // 兜底:直接导航到第一个点
        const first = wps[0];
        wx.openLocation({
          latitude: Number(first.latitude),
          longitude: Number(first.longitude),
          name: first.name,
          address: first.name
        });
      }
    });
  },

  goBack() { wx.navigateBack(); },

  onShareAppMessage() {
    const r = this.data.route;
    const title = r ? `${r.title} - 画海民宿` : '南澳岛游玩路线 - 画海';
    return {
      title,
      path: `/pages/route-detail/index?id=${this.data.routeId}`,
      imageUrl: r && r.cover ? r.cover : '/images/logo.jpg'
    };
  },

  onShareTimeline() {
    const r = this.data.route;
    return {
      title: r ? r.title : '南澳岛游玩路线',
      query: `id=${this.data.routeId}`,
      imageUrl: r && r.cover ? r.cover : '/images/logo.jpg'
    };
  }
});

const TRANSPORT_LABEL = {
  driving: '驾车',
  walking: '步行',
  mixed: '混合'
};

function formatDistance(m) {
  if (!isFinite(Number(m)) || m <= 0) return '';
  const km = m / 1000;
  if (km < 1) return `${Math.round(m)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function formatDuration(sec) {
  if (!isFinite(Number(sec)) || sec <= 0) return '';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatStay(min) {
  if (!isFinite(Number(min)) || min <= 0) return '';
  if (min < 60) return `停留 ${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `停留 ${h}h ${m}min` : `停留 ${h}h`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
