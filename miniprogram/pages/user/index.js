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

  // 加载收藏列表（从数据库）
  async loadFavorites() {
    this.setData({ loading: true });

    try {
      // 从数据库查询收藏列表
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getFavorites'
        }
      });

      if (res.result.success && res.result.data.length > 0) {
        const favorites = res.result.data;

        // 批量获取详情
        const promises = favorites.map(async (fav) => {
          try {
            let detailRes;
            if (fav.category === 'room') {
              // 加载房型详情
              detailRes = await wx.cloud.callFunction({
                name: 'huahai',
                data: {
                  type: 'getRoomDetail',
                  roomId: fav.guideId
                }
              });
            } else {
              // 加载攻略详情
              detailRes = await wx.cloud.callFunction({
                name: 'huahai',
                data: {
                  type: 'getGuideDetail',
                  id: fav.guideId
                }
              });
            }

            if (detailRes.result.success && detailRes.result.data) {
              const item = detailRes.result.data;
              // 添加分类标识，用于区分
              item.category = fav.category;
              item.favoriteId = fav._id;
              // 统一显示字段
              if (fav.category === 'room') {
                item.displayTitle = item.roomType;
                item.displayDesc = `${item.area} · ${item.bedType}`;
                item.displayImage = item.images && item.images[0] ? item.images[0] : '';
              } else {
                // 攻略/美食：优先使用images[0]，没有则使用cover
                item.displayTitle = item.title;
                item.displayDesc = item.summary || item.address || '';
                item.displayImage = (item.images && item.images.length > 0) ? item.images[0] : (item.cover || '');
              }
              return item;
            }
            return null;
          } catch (err) {
            console.error('加载收藏详情失败', fav, err);
            return null;
          }
        });

        const results = await Promise.all(promises);
        const validFavorites = results.filter(item => item !== null);

        this.setData({
          favorites: validFavorites,
          loading: false
        });
      } else {
        this.setData({
          favorites: [],
          loading: false
        });
      }
    } catch (err) {
      console.error('加载收藏失败', err);
      this.setData({ loading: false });
    }
  },

  // 打开收藏的攻略或房型
  openGuide(e) {
    const { id, category } = e.currentTarget.dataset;

    if (category === 'room') {
      // 跳转到房型详情页
      wx.navigateTo({
        url: `/pages/room-detail/room-detail?id=${id}`
      });
    } else {
      // 跳转到攻略详情页
      wx.navigateTo({
        url: `/pages/guide-detail/index?id=${id}`
      });
    }
  },

  // 取消收藏
  async removeFavorite(e) {
    const { id, category } = e.currentTarget.dataset;

    wx.showModal({
      title: '提示',
      content: '确定取消收藏？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            // 调用云函数取消收藏
            const favRes = await wx.cloud.callFunction({
              name: 'huahai',
              data: {
                type: 'toggleFavorite',
                guideId: id,
                category: category || 'guide'
              }
            });

            wx.hideLoading();

            if (favRes.result.success) {
              // 立即从本地列表中移除该项
              const favorites = this.data.favorites.filter(item => {
                return item._id !== id;
              });

              this.setData({
                favorites
              });

              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              });
            } else {
              throw new Error('操作失败');
            }
          } catch (err) {
            console.error('取消收藏失败', err);
            wx.hideLoading();
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
      content: '电话：18907208020\n微信：qingaiyisheng321',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '18907208020'
          });
        }
      }
    });
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '画海小程序 v1.0.0\n南澳岛旅行攻略与实景记录',
      showCancel: false
    });
  },

  // 跳转到管理后台
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '画海民宿 - 收藏你的南澳岛记忆',
      path: '/pages/user/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '画海民宿 - 发现南澳岛的美好',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
