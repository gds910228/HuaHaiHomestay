// pages/hostel/index.js
Page({
  data: {
    hostel: null,
    rooms: [],
    loading: true
  },

  onLoad() {
    this.loadHostelInfo();
    this.loadRooms();
  },

  // 加载民宿信息
  async loadHostelInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getHostelInfo'
        }
      });

      if (res.result.success) {
        this.setData({ hostel: res.result.data });
      }
    } catch (err) {
      console.error('加载民宿信息失败', err);
    }
  },

  // 加载房型列表
  async loadRooms() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getRooms'
        }
      });

      if (res.result.success) {
        this.setData({ rooms: res.result.data });
      }
    } catch (err) {
      console.error('加载房型失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 预览相册图片
  previewAlbum(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || []
    });
  },

  // 拨打电话
  makeCall() {
    const { hostel } = this.data;
    if (!hostel || !hostel.phone) {
      wx.showToast({
        title: '暂无电话信息',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '拨打电话',
      content: hostel.phone,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: hostel.phone
          });
        }
      }
    });
  },

  // 复制微信号
  copyWechat() {
    const { hostel } = this.data;
    if (!hostel || !hostel.wechat) {
      wx.showToast({
        title: '暂无微信号',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: hostel.wechat,
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success'
        });
      }
    });
  },

  // 一键导航
  navigate() {
    const { hostel } = this.data;
    if (!hostel || !hostel.location) {
      wx.showToast({
        title: '暂无位置信息',
        icon: 'none'
      });
      return;
    }

    wx.openLocation({
      latitude: hostel.location.latitude,
      longitude: hostel.location.longitude,
      name: hostel.name,
      address: hostel.address
    });
  },

  // 查看房型详情
  viewRoom(e) {
    const room = e.currentTarget.dataset.room;
    // 可以跳转到房型详情页，或者显示弹窗
    wx.showModal({
      title: room.roomType,
      content: room.description,
      showCancel: false
    });
  }
});
