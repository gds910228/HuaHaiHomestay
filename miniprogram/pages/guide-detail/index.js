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
      this.checkFavorite();
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
        this.setData({ guide: res.result.data });

        // 增加浏览量
        wx.cloud.callFunction({
          name: 'huahai',
          data: {
            type: 'incrementViews',
            id: this.data.id
          }
        }).catch(() => {});
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

  // 检查是否已收藏
  async checkFavorite() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'checkFavorite',
          guideId: this.data.id
        }
      });

      if (res.result.success) {
        this.setData({ isFavorite: res.result.data });
      }
    } catch (err) {
      console.error('检查收藏状态失败', err);
    }
  },

  // 收藏/取消收藏
  async toggleFavorite() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: this.data.isFavorite ? 'removeFavorite' : 'addFavorite',
          guideId: this.data.id
        }
      });

      if (res.result.success) {
        this.setData({
          isFavorite: !this.data.isFavorite
        });
        wx.showToast({
          title: this.data.isFavorite ? '已取消收藏' : '已收藏',
          icon: 'success'
        });
      }
    } catch (err) {
      console.error('收藏操作失败', err);
      wx.showToast({
        title: '操作失败',
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

  // 分享
  onShareAppMessage() {
    const { guide } = this.data;
    return {
      title: guide ? guide.title : '画海民宿',
      path: `/pages/guide-detail/index?id=${this.data.id}`,
      imageUrl: guide ? guide.cover : ''
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
