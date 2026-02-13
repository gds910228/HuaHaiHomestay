// pages/admin/hostel/index.js
Page({
  data: {
    hostel: null,
    rooms: [],
    loading: true,
    activeTab: 'hostel'
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true });

    try {
      const [hostelRes, roomsRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'huahai',
          data: { type: 'adminGetHostel' }
        }),
        wx.cloud.callFunction({
          name: 'huahai',
          data: { type: 'adminGetRooms' }
        })
      ]);

      if (hostelRes.result.success) {
        this.setData({ hostel: hostelRes.result.data });
      }

      if (roomsRes.result.success) {
        this.setData({ rooms: roomsRes.result.data });
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

  // 编辑民宿信息
  editHostel() {
    const data = JSON.stringify(this.data.hostel);
    wx.navigateTo({
      url: `/pages/admin/hostel-edit/index?data=${encodeURIComponent(data)}`
    });
  },

  // 新增房型
  addRoom() {
    wx.navigateTo({
      url: '/pages/admin/room-edit/index'
    });
  },

  // 编辑房型
  editRoom(e) {
    const index = e.currentTarget.dataset.index;
    const room = this.data.rooms[index];
    wx.navigateTo({
      url: `/pages/admin/room-edit/index?data=${encodeURIComponent(JSON.stringify(room))}`
    });
  },

  // 删除房型
  deleteRoom(e) {
    const { index, roomType } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: `确定删除"${roomType}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const response = await wx.cloud.callFunction({
              name: 'huahai',
              data: {
                type: 'adminDeleteRoom',
                id: this.data.rooms[index]._id
              }
            });

            wx.hideLoading();

            if (response.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadData();
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
  }
});
