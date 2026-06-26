// pages/info/index.js
Page({
  data: {
    category: { id: 'info', name: '实用信息', emoji: '📝', subtitle: '出行 / 食宿 / 注意事项' },
    guides: [],
    loading: false,
    isFirstLoad: true,

    tagOptions: [],
    activeTag: '',
    tagsExpanded: false
  },

  onLoad() {
    this.loadTagOptions();
    this.loadGuides();
  },

  onShow() {
    this.loadGuides();
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
      console.warn('[实用信息] 加载标签失败', err);
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

  async loadGuides() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const callData = {
        type: 'getGuides',
        category: this.data.category.id,
        pageSize: 100
      };
      if (this.data.activeTag) callData.tag = this.data.activeTag;

      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: callData
      });

      if (res.result && res.result.success) {
        let guides = res.result.data || [];

        guides = guides.filter(g => g.category === this.data.category.id);
        guides = guides.filter(g => !g.status || g.status === 'published');
        if (this.data.activeTag) {
          const t = this.data.activeTag;
          guides = guides.filter(g => Array.isArray(g.tags) && g.tags.indexOf(t) > -1);
        }

        guides.forEach((guide) => {
          const hasImages = guide.images && guide.images.length > 0;
          const firstImage = hasImages ? guide.images[0] : '';
          // 卡片缩略图:优先用 cover 字段,回退到 images[0]
          const coverImage = guide.cover || firstImage || '';
          const isPlaceholder = coverImage && coverImage.includes('placeholder');
          guide.coverImage = coverImage;
          guide.hasRealImage = !!coverImage && !isPlaceholder;
        });

        await this.checkFavoritesStatus(guides);

        this.setData({ guides, loading: false, isFirstLoad: false });
      } else {
        wx.showToast({ title: res.result?.errMsg || '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('[实用信息] 加载失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
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
      console.error('[实用信息] 检查收藏失败', err);
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
        wx.showToast({ title: isFavorited ? '已收藏' : '已取消收藏', icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: `南澳岛${this.data.category.name} - 画海民宿`,
      path: `/pages/${this.data.category.id}/index`,
      imageUrl: '/images/logo.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: `南澳岛${this.data.category.name} - 画海民宿`,
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
