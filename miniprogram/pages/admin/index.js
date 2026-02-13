// pages/admin/index.js
Page({
  data: {
    isAdmin: false
  },

  onLoad() {
    this.checkAdmin();
  },

  // 检查管理员权限
  checkAdmin() {
    const isAdmin = wx.getStorageSync('isAdmin');
    if (isAdmin) {
      this.setData({ isAdmin: true });
    }
  },

  // 管理员登录
  async login() {
    wx.showModal({
      title: '管理员登录',
      editable: true,
      placeholderText: '请输入管理员密码',
      success: async (res) => {
        if (res.confirm && res.content) {
          wx.showLoading({ title: '登录中...' });

          try {
            const response = await wx.cloud.callFunction({
              name: 'huahai',
              data: {
                type: 'adminLogin',
                password: res.content
              }
            });

            wx.hideLoading();

            if (response.result.success) {
              wx.setStorageSync('isAdmin', true);
              this.setData({ isAdmin: true });
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: response.result.errMsg || '登录失败',
                icon: 'none'
              });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('isAdmin');
          this.setData({ isAdmin: false });
          wx.showToast({
            title: '已退出',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到攻略管理
  goToGuides() {
    wx.navigateTo({
      url: '/pages/admin/guides/index'
    });
  },

  // 跳转到民宿信息管理
  goToHostel() {
    wx.navigateTo({
      url: '/pages/admin/hostel/index'
    });
  }
});
