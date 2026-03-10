// pages/room-detail/room-detail.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    roomId: '',
    room: null,
    loading: true,
    currentImageIndex: 0,

    // 设施分类显示控制
    showServices: true,
    showBasic: true,
    showBathroom: true,
    showKitchen: true,
    showSurroundings: true,
    showSafety: true,
    showEntertainment: true,
    showLeisure: true,

    // 入住须知展开控制
    showCheckInRules: false,

    // 接待要求展开控制
    showGuestRequirements: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('房间详情页加载，参数:', options);

    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '房间ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      roomId: id
    });

    this.loadRoomDetail(id);
  },

  /**
   * 加载房间详情
   */
  async loadRoomDetail(roomId) {
    console.log('开始加载房间详情，ID:', roomId);

    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      // 调用云函数获取房间详情
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getRoomDetail',
          roomId: roomId
        }
      });

      console.log('房间详情查询结果:', res);

      if (res.result.success && res.result.data) {
        const room = res.result.data;

        // 打印 detailedFacilities 数据用于调试
        console.log('房型 detailedFacilities 数据:', room.detailedFacilities);
        console.log('房型 facilities 数据:', room.facilities);

        // 确保 detailedFacilities 存在且有默认结构
        if (!room.detailedFacilities) {
          room.detailedFacilities = {
            services: [],
            basic: room.facilities || [],
            bathroom: [],
            kitchen: [],
            surroundings: [],
            safety: [],
            entertainment: [],
            leisure: []
          };
          console.log('初始化 detailedFacilities 结构');
        }

        // 处理价格兼容性（支持旧数据结构的 price.low/high 和新数据结构的 fixedPrice）
        if (room.fixedPrice) {
          room.displayPrice = `¥${room.fixedPrice}`;
        } else if (room.price && room.price.low) {
          room.displayPrice = `¥${room.price.low}-${room.price.high}`;
        } else {
          room.displayPrice = '价格暂无';
        }

        // 处理入住人数显示
        if (room.maxGuests) {
          room.guestDisplay = `可住${room.maxGuests}人${room.allowExtraGuests ? '（可加人）' : '（不可加人）'}`;
        }

        this.setData({
          room: room,
          loading: false
        });

        wx.hideLoading();
      } else {
        throw new Error(res.result.errMsg || '获取房间详情失败');
      }
    } catch (err) {
      console.error('加载房间详情失败:', err);
      wx.hideLoading();

      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none',
        duration: 2000
      });

      // 加载失败，返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  /**
   * 图片轮播改变事件
   */
  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  /**
   * 切换设施分类展开/收起
   */
  toggleFacilityCategory(e) {
    const { category } = e.currentTarget.dataset;
    const key = `show${category.charAt(0).toUpperCase() + category.slice(1)}`;
    this.setData({
      [key]: !this.data[key]
    });
  },

  /**
   * 切换入住须知展开/收起
   */
  toggleCheckInRules() {
    this.setData({
      showCheckInRules: !this.data.showCheckInRules
    });
  },

  /**
   * 切换接待要求展开/收起
   */
  toggleGuestRequirements() {
    this.setData({
      showGuestRequirements: !this.data.showGuestRequirements
    });
  },

  /**
   * 收藏房间
   */
  async handleFavorite() {
    const { room, roomId } = this.data;

    if (!room) return;

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
          guideId: roomId, // 使用guideId字段存储roomId
          category: 'room'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const { isFavorited } = res.result.data;
        wx.showToast({
          title: isFavorited ? '已收藏' : '已取消收藏',
          icon: 'success'
        });

        // 更新页面状态
        this.setData({
          'room.isFavorited': isFavorited
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

  /**
   * 联系客服
   */
  handleContact() {
    const { room } = this.data;

    if (room && room.phone) {
      wx.makePhoneCall({
        phoneNumber: room.phone
      });
    } else {
      // 使用默认民宿电话
      wx.makePhoneCall({
        phoneNumber: '18907208020'
      });
    }
  },

  /**
   * 立即预订
   */
  handleBooking() {
    const { room } = this.data;

    if (!room) return;

    // TODO: 实现预订功能
    wx.showModal({
      title: '预订提示',
      content: '预订功能即将上线，敬请期待！\n\n如需预订，请直接联系客服。',
      confirmText: '联系客服',
      cancelText: '我知道了',
      success(res) {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '18907208020'
          });
        }
      }
    });
  },

  /**
   * 分享房间
   */
  onShareAppMessage() {
    const { room } = this.data;

    return {
      title: room ? `${room.roomType} - 画海民宿` : '画海民宿房型',
      path: `/pages/room-detail/room-detail?id=${this.data.roomId}`,
      imageUrl: (room && room.images && room.images.length > 0) ? room.images[0] : '/images/logo.jpg'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const { room } = this.data;

    return {
      title: room ? `${room.roomType} - 画海民宿` : '画海民宿房型',
      query: `id=${this.data.roomId}`,
      imageUrl: (room && room.images && room.images.length > 0) ? room.images[0] : '/images/logo.jpg'
    };
  }
});
