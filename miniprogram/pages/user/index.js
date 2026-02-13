// pages/user/index.js
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    favorites: [],
    history: [],
    loading: true
  },

  onLoad() {
    this.loadUserInfo();
    this.loadFavorites();
    this.loadHistory();
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.hasUserInfo) {
      this.loadFavorites();
    }
  },

  // 加载用户信息
  loadUserInfo() {
    // 从缓存获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo,
        hasUserInfo: true
      });
    }
    this.setData({ loading: false });
  },

  // 授权获取用户信息
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const userInfo = res.userInfo;
        this.setData({
          userInfo,
          hasUserInfo: true
        });
        wx.setStorageSync('userInfo', userInfo);
      },
      fail: () => {
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载收藏列表
  async loadFavorites() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getFavorites'
        }
      });

      if (res.result.success) {
        this.setData({ favorites: res.result.data });
      }
    } catch (err) {
      console.error('加载收藏失败', err);
    }
  },

  // 加载浏览历史
  loadHistory() {
    const history = wx.getStorageSync('browseHistory') || [];
    this.setData({ history });
  },

  // 打开收藏的攻略
  openGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/guide-detail/index?id=${id}`
    });
  },

  // 取消收藏
  async removeFavorite(e) {
    const { id, index } = e.currentTarget.dataset;

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'removeFavorite',
          guideId: id
        }
      });

      if (res.result.success) {
        const favorites = this.data.favorites;
        favorites.splice(index, 1);
        this.setData({ favorites });
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        });
      }
    } catch (err) {
      console.error('取消收藏失败', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空浏览历史？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('browseHistory');
          this.setData({ history: [] });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  // 联系客服
  contactService() {
    // 这里可以配置客服消息或显示联系方式
    wx.showModal({
      title: '联系客服',
      content: '电话：xxxxxxxxxx\n微信：xxxxxxxxxx',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: 'xxxxxxxxxx' // 替换为实际电话
          });
        }
      }
    });
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '画海民宿小程序 v1.0.0\n为游客提供南澳岛旅游攻略与住宿信息',
      showCancel: false
    });
  },

  // 跳转到数据初始化
  goToInit: function() {
    console.log('goToInit 被调用');
    wx.navigateTo({
      url: '/pages/init/index'
    });
  }
});
