// pages/admin/guides/index.js
Page({
  data: {
    guides: [],
    loading: true,
    filterStatus: '',
    filterCategory: ''
  },

  onLoad() {
    this.loadGuides();
  },

  onShow() {
    this.loadGuides();
  },

  // 加载攻略列表
  async loadGuides() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminGetGuides',
          status: this.data.filterStatus || undefined,
          category: this.data.filterCategory || undefined
        }
      });

      if (res.result.success) {
        this.setData({ guides: res.result.data });
      }
    } catch (err) {
      console.error('加载失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 新增攻略
  addGuide() {
    wx.navigateTo({
      url: '/pages/admin/guide-edit/index'
    });
  },

  // 编辑攻略
  editGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/guide-edit/index?id=${id}`
    });
  },

  // 删除攻略
  deleteGuide(e) {
    const { id, title } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: `确定删除"${title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const response = await wx.cloud.callFunction({
              name: 'huahai',
              data: {
                type: 'adminDeleteGuide',
                id
              }
            });

            wx.hideLoading();

            if (response.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadGuides();
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 切换发布状态
  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === 'published' ? 'draft' : 'published';

    wx.showLoading({ title: '更新中...' });

    try {
      await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminSaveGuide',
          id,
          status: newStatus
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
      this.loadGuides();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  },

  // 筛选
  onFilterChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    if (field === 'status') {
      this.setData({ filterStatus: value });
    } else if (field === 'category') {
      this.setData({ filterCategory: value });
    }

    this.loadGuides();
  }
});
