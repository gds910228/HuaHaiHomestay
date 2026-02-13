// pages/home/index.js
Page({
  data: {
    categories: [
      { id: 'food', name: '美食推荐', icon: '🍤' },
      { id: 'route', name: '游玩路线', icon: '🗺️' },
      { id: 'info', name: '实用信息', icon: '📝' },
      { id: 'spot', name: '景点打卡', icon: '📍' }
    ],
    currentCategory: 'food',
    guides: [],
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadGuides();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadGuides();
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.loadGuides();
  },

  // 加载攻略列表
  async loadGuides() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getGuides',
          category: this.data.currentCategory
        }
      });

      if (res.result.success) {
        this.setData({
          guides: res.result.data,
          hasMore: res.result.data.length >= 10
        });
      }
    } catch (err) {
      console.error('加载攻略失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 查看攻略详情
  viewGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/guide-detail/index?id=${id}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadGuides().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      // TODO: 实现分页加载
    }
  }
});
