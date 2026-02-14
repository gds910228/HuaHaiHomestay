// pages/user/index.js
Page({
  data: {
    favorites: [],
    loading: true
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadFavorites();
  },

  // 加载收藏列表（从本地存储）
  async loadFavorites() {
    this.setData({ loading: true });

    try {
      const favoriteIds = wx.getStorageSync('favorites') || [];

      if (favoriteIds.length === 0) {
        this.setData({
          favorites: [],
          loading: false
        });
        return;
      }

      // 批量获取攻略详情
      const promises = favoriteIds.map(async (id) => {
        try {
          const res = await wx.cloud.callFunction({
            name: 'huahai',
            data: {
              type: 'getGuideDetail',
              id: id
            }
          });
          return res.result.success ? res.result.data : null;
        } catch (err) {
          console.error('加载收藏攻略失败', id, err);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const guides = results.filter(g => g !== null);

      this.setData({
        favorites: guides,
        loading: false
      });
    } catch (err) {
      console.error('加载收藏失败', err);
      this.setData({ loading: false });
    }
  },

  // 打开收藏的攻略
  openGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/guide-detail/index?id=${id}`
    });
  },

  // 取消收藏
  removeFavorite(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '提示',
      content: '确定取消收藏？',
      success: (res) => {
        if (res.confirm) {
          try {
            let favorites = wx.getStorageSync('favorites') || [];
            favorites = favorites.filter(favId => favId !== id);

            wx.setStorageSync('favorites', favorites);

            // 重新加载收藏列表
            this.loadFavorites();

            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            });
          } catch (err) {
            console.error('取消收藏失败', err);
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '电话：13800138000\n微信：huahai_hostel',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '13800138000'
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
  goToInit() {
    wx.navigateTo({
      url: '/pages/init/index'
    });
  }
});
