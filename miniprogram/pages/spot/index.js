// pages/spot/index.js
Page({
  data: {
    category: { id: 'spot', name: '景点打卡', emoji: '📍', subtitle: '热门景点 / 摄影机位 / 海岛风光' },
    guides: [],          // 原始数据(已附加 distance/walkingMin/weatherBrief/playable)
    filteredGuides: [],  // 应用 weatherFilter 后的展示数据
    loading: false,
    isFirstLoad: true,
    errorMsg: '',

    tagOptions: [],
    activeTag: '',
    tagsExpanded: false,

    // 定位
    userLocation: null,        // {latitude, longitude} or null
    hasLocation: false,        // 是否已获得用户位置
    locationDenied: false,     // 是否被拒绝(用于显示去设置引导)

    // 天气筛选
    weatherFilter: false,      // 是否只看"现在适合玩"
    playableCount: 0           // 适合玩的景点数
  },

  onLoad() {
    this.loadTagOptions();
    this.checkLocationSetting();
    this.loadGuides();
  },

  onShow() {
    // 用户从设置返回时刷新授权状态
    this.checkLocationSetting();
  },

  /** 静默读授权状态,不主动弹权限框 */
  checkLocationSetting() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this.fetchUserLocation();
        } else if (res.authSetting['scope.userLocation'] === false) {
          this.setData({ locationDenied: true });
        }
      }
    });
  },

  /** 用户点"开启定位"按钮 */
  requestLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: { latitude: res.latitude, longitude: res.longitude },
          hasLocation: true,
          locationDenied: false
        });
        this.loadGuides();
      },
      fail: (err) => {
        console.warn('[景点] getLocation 失败', err);
        if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
          this.setData({ locationDenied: true });
          wx.showModal({
            title: '需要定位权限',
            content: '开启后可按距离排序附近景点',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) {
                wx.openSetting({
                  success: (s) => {
                    if (s.authSetting['scope.userLocation']) {
                      this.fetchUserLocation();
                    }
                  }
                });
              }
            }
          });
        } else {
          wx.showToast({ title: '定位失败,请重试', icon: 'none' });
        }
      }
    });
  },

  /** 已授权后静默拉位置 */
  fetchUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: { latitude: res.latitude, longitude: res.longitude },
          hasLocation: true,
          locationDenied: false
        });
        this.loadGuides();
      },
      fail: (err) => {
        console.warn('[景点] fetchUserLocation 失败', err);
      }
    });
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
      console.warn('[景点] 加载标签失败', err);
    }
  },

  selectTag(e) {
    const tag = e.currentTarget.dataset.tag || '';
    this.setData({ activeTag: tag === this.data.activeTag ? '' : tag });
    this.loadGuides();
  },

  toggleTagsExpanded() {
    this.setData({ tagsExpanded: !this.data.tagsExpanded });
  },

  toggleWeatherFilter() {
    const next = !this.data.weatherFilter;
    this.setData({ weatherFilter: next });
    this.applyFilter();
  },

  async loadGuides() {
    if (this.data.loading) return;
    this.setData({ loading: true, errorMsg: '' });

    try {
      let guides;

      if (this.data.hasLocation && this.data.userLocation) {
        // 有定位:走 getNearbySpots,按距离排序
        const { latitude, longitude } = this.data.userLocation;
        const res = await wx.cloud.callFunction({
          name: 'huahai',
          data: {
            type: 'getNearbySpots',
            latitude,
            longitude,
            radius: 50000,
            limit: 50
          }
        });
        if (!res.result || !res.result.success) throw new Error(res.result?.errMsg || '加载失败');
        guides = res.result.data || [];
      } else {
        // 无定位:走原有 getGuides
        const callData = {
          type: 'getGuides',
          category: this.data.category.id,
          pageSize: 100,
          withWeather: true
        };
        if (this.data.activeTag) callData.tag = this.data.activeTag;

        const res = await wx.cloud.callFunction({ name: 'huahai', data: callData });
        if (!res.result || !res.result.success) throw new Error(res.result?.errMsg || '加载失败');
        guides = res.result.data || [];
      }

      // 客户端兜底过滤
      guides = guides.filter(g => g.category === this.data.category.id);
      guides = guides.filter(g => !g.status || g.status === 'published');
      if (this.data.activeTag) {
        const t = this.data.activeTag;
        guides = guides.filter(g => Array.isArray(g.tags) && g.tags.indexOf(t) > -1);
      }

      // 派生显示字段
      guides.forEach((guide) => {
        const hasImages = guide.images && guide.images.length > 0;
        const firstImage = hasImages ? guide.images[0] : '';
        const isPlaceholder = firstImage && firstImage.includes('placeholder');
        guide.hasRealImage = hasImages && !isPlaceholder;

        // 距离/步行(优先用户位置 → 服务端预算 → 无)
        guide.distanceDisplay = this.computeDistanceDisplay(guide);

        // 天气摘要
        guide.weatherBrief = this.extractWeatherBrief(guide.weather);

        // 是否适合玩
        guide.playable = this.isPlayable(guide.weather);
      });

      await this.checkFavoritesStatus(guides);

      const playableCount = guides.filter(g => g.playable).length;

      this.setData({
        guides,
        playableCount,
        loading: false,
        isFirstLoad: false
      });
      this.applyFilter();
    } catch (err) {
      console.error('[景点] 加载失败', err);
      this.setData({
        loading: false,
        isFirstLoad: false,
        errorMsg: err.message || '加载失败,请下拉重试'
      });
    }
  },

  /** 根据 weatherFilter 派生 filteredGuides */
  applyFilter() {
    const { guides, weatherFilter } = this.data;
    const filteredGuides = weatherFilter ? guides.filter(g => g.playable) : guides;
    this.setData({ filteredGuides });
  },

  /** 派生"1.2km · 步行 15 分钟"显示字符串 */
  computeDistanceDisplay(guide) {
    // 优先:服务端 getNearbySpots 算出的 distance (km)
    if (typeof guide.distance === 'number') {
      const km = guide.distance;
      const walkingMin = Math.max(1, Math.round(km * 1000 / 80));
      return {
        text: `${km.toFixed(km < 1 ? 2 : 1)}km · 步行 ${walkingMin} 分钟`,
        fromUser: true
      };
    }
    // 其次:同步时预算的"从画海出发"步行
    if (guide.walkingFromHostel && guide.walkingFromHostel.distance) {
      const km = guide.walkingFromHostel.distance / 1000;
      const min = Math.max(1, Math.round(guide.walkingFromHostel.duration / 60));
      return {
        text: `从画海 ${km.toFixed(km < 1 ? 2 : 1)}km · 步行 ${min} 分钟`,
        fromUser: false
      };
    }
    return null;
  },

  /**
   * 提取天气摘要给卡片右上角徽章
   * 优先用 weather.now;若 now 为空,fallback 到 forecast3d[0](当日预报)
   * 这样即便 QWeather 实时接口失败,只要 7d 接口能拿到一天数据也能出徽章
   *
   * 注意:不使用 weather.now.iconUrl(和风 CDN a.hecdn.net 在小程序环境不可达,实测 ERR_CONNECTION_REFUSED)
   *      改用 emoji 表达天气状态,无外网依赖
   */
  extractWeatherBrief(weather) {
    if (!weather) return null;
    if (weather.now) {
      const { temp, text, icon } = weather.now;
      return {
        temp: temp != null ? `${temp}°` : '',
        text: text || '',
        emoji: weatherCodeToEmoji(icon, text),
        fromForecast: false
      };
    }
    const today = weather.forecast3d && weather.forecast3d[0];
    if (today) {
      const tMax = today.tempMax;
      const tMin = today.tempMin;
      let tempStr = '';
      if (tMax != null && tMin != null) tempStr = `${tMin}~${tMax}°`;
      else if (tMax != null) tempStr = `${tMax}°`;
      return {
        temp: tempStr,
        text: today.textDay || '',
        emoji: weatherCodeToEmoji(today.iconDay, today.textDay),
        fromForecast: true
      };
    }
    return null;
  },

  /** 是否"现在适合玩":无雨/雷/雪 且 风力 <6 (now 缺失则看 forecast 当日) */
  isPlayable(weather) {
    if (!weather) return false;
    const src = weather.now || (weather.forecast3d && weather.forecast3d[0]) || null;
    if (!src) return false;
    const text = String(src.text || src.textDay || '');
    if (/雨|雷|雪|沙尘|霾/.test(text)) return false;
    const ws = Number(src.windScale || src.windScaleDay);
    if (isFinite(ws) && ws >= 6) return false;
    return true;
  },

  viewGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/guide-detail/index?id=${id}` });
  },

  previewImage(e) {
    const { url, images } = e.currentTarget.dataset;
    const imageUrls = images && images.length > 0 ? images : [url];
    wx.previewImage({ current: url, urls: imageUrls });
  },

  navigate(e) {
    const { latitude, longitude, title, address } = e.currentTarget.dataset;
    if (!latitude || !longitude) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' });
      return;
    }
    wx.openLocation({ latitude, longitude, name: title, address: address || title });
  },

  goHome() { wx.switchTab({ url: '/pages/home/index' }); },

  retry() {
    this.loadGuides();
  },

  async checkFavoritesStatus(guides) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: { type: 'getFavorites' }
      });
      if (res.result.success && res.result.data) {
        const favorites = res.result.data;
        guides.forEach(guide => {
          guide.isFavorited = favorites.some(
            fav => fav.guideId === guide._id && fav.category === 'guide'
          );
        });
      }
    } catch (err) {
      console.error('[景点] 检查收藏失败', err);
    }
  },

  async toggleFavorite(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    try {
      wx.showLoading({ title: '处理中...', mask: true });
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: { type: 'toggleFavorite', guideId: id, category: 'guide' }
      });
      wx.hideLoading();
      if (res.result.success) {
        const { isFavorited } = res.result.data;
        const guides = this.data.guides.map(g =>
          g._id === id ? { ...g, isFavorited } : g
        );
        this.setData({ guides });
        this.applyFilter();
        wx.showToast({ title: isFavorited ? '已收藏' : '已取消收藏', icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: `南澳岛${this.data.category.name} - 画海`,
      path: `/pages/${this.data.category.id}/index`,
      imageUrl: '/images/logo.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: `南澳岛${this.data.category.name} - 画海`,
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});

/**
 * 和风天气 icon code → emoji
 * 文档:https://dev.qweather.com/docs/resource/icons/
 * code 分段:
 *   100-199 晴/多云/阴       2xx 风/沙
 *   300-318 雨               400-499 雪
 *   500-515 雾/霾            900+ 冷热
 * fallback 用 text 文本兜底,处理 code 缺失或非标情况
 */
function weatherCodeToEmoji(code, text) {
  const c = String(code || '').trim();
  if (c) {
    // 晴
    if (c === '100') return '☀️';
    if (c === '150') return '🌙';
    // 多云 / 少云 / 晴间多云
    if (c === '101' || c === '102' || c === '103') return '⛅';
    if (c === '151' || c === '152' || c === '153') return '☁️';
    // 阴
    if (c === '104' || c === '154') return '☁️';
    // 阵雨 / 雷阵雨
    if (c.startsWith('30') && c < '305') return '⛈️';
    // 小雨 / 中雨 / 大雨 / 暴雨
    if (c.startsWith('3')) return '🌧️';
    // 雪 / 雨夹雪
    if (c.startsWith('4')) return '❄️';
    // 雾 / 霾 / 沙尘
    if (c.startsWith('5')) return '🌫️';
    // 风沙
    if (c.startsWith('2')) return '💨';
    // 冷热
    if (c === '900') return '🥵';
    if (c === '901') return '🥶';
  }
  // 文字兜底:从 text 推断
  const t = String(text || '');
  if (/雷/.test(t)) return '⛈️';
  if (/雨/.test(t)) return '🌧️';
  if (/雪/.test(t)) return '❄️';
  if (/雾|霾/.test(t)) return '🌫️';
  if (/沙|尘/.test(t)) return '💨';
  if (/阴/.test(t)) return '☁️';
  if (/多云|云/.test(t)) return '⛅';
  if (/晴/.test(t)) return '☀️';
  return '🌤️'; // 缺省
}

