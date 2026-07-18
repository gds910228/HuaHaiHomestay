// pages/guide-detail/index.js
Page({
  data: {
    id: '',
    guide: null,
    loading: true,
    isFavorite: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadGuideDetail();
    }
  },

  // 加载攻略详情
  async loadGuideDetail() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getGuideDetail',
          id: this.data.id
        }
      });

      if (res.result.success) {
        const guide = res.result.data;

        // 派生轮播图:cover 优先,images 跟后,去重去空
        const displayImages = [];
        const seen = new Set();
        const pushIf = (url) => {
          if (!url) return;
          if (seen.has(url)) return;
          seen.add(url);
          displayImages.push(url);
        };
        pushIf(guide.cover);
        (guide.images || []).forEach(pushIf);
        guide.displayImages = displayImages;

        this.setData({
          guide: guide,
          isFavorite: guide.isFavorited || false
        });

        // 动态更新导航栏标题：用攻略真实标题替换静态默认值，利于微信搜一搜抓取及分享/收藏展示
        if (guide.title) {
          wx.setNavigationBarTitle({ title: `${guide.title} - 南澳岛攻略` });
        }
      }
    } catch (err) {
      console.error('加载详情失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 收藏/取消收藏（调用云函数）
  async toggleFavorite() {
    try {
      wx.showLoading({
        title: '处理中...',
        mask: true
      });

      // 调用云函数收藏/取消收藏
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'toggleFavorite',
          guideId: this.data.id,
          category: 'guide'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const { isFavorited } = res.result.data;

        this.setData({
          isFavorite: isFavorited
        });

        wx.showToast({
          title: isFavorited ? '已收藏' : '已取消收藏',
          icon: 'success'
        });
      } else {
        throw new Error(res.result.errMsg || '操作失败');
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 一键导航
  navigate() {
    const { guide } = this.data;
    if (!guide || !guide.location) {
      wx.showToast({
        title: '暂无位置信息',
        icon: 'none'
      });
      return;
    }

    wx.openLocation({
      latitude: guide.location.latitude,
      longitude: guide.location.longitude,
      name: guide.title,
      address: guide.address || guide.title
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    const { guide } = this.data;
    return {
      title: guide ? `${guide.title} - 画海民宿` : '画海民宿 - 南澳岛旅游攻略',
      path: `/pages/guide-detail/index?id=${this.data.id}`,
      imageUrl: (guide && guide.cover) ? guide.cover : '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { guide } = this.data;
    return {
      title: guide ? `${guide.title} - 画海民宿` : '画海民宿 - 南澳岛旅游攻略',
      query: `id=${this.data.id}`,
      imageUrl: (guide && guide.cover) ? guide.cover : '/images/logo.jpg'
    };
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  }
});
