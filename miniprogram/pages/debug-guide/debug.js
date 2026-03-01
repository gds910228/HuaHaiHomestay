// pages/debug-guide/debug.js
Page({
  data: {
    guideData: null,
    loading: true
  },

  onLoad() {
    // 这里填入"阿雄酒料"的ID
    this.debugGuide();
  },

  async debugGuide() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 调用云函数获取数据
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getGuideDetail',
          id: 'your_guide_id_here' // 请替换为实际的攻略ID
        }
      });

      wx.hideLoading();

      console.log('=== 攻略数据 ===');
      console.log(res);

      if (res.result.success) {
        const guide = res.result.data;
        console.log('攻略标题:', guide.title);
        console.log('cover:', guide.cover);
        console.log('images:', guide.images);
        console.log('images.length:', guide.images ? guide.images.length : 0);

        this.setData({
          guideData: JSON.stringify(guide, null, 2),
          loading: false
        });

        wx.showModal({
          title: '数据结构',
          content: `cover: ${guide.cover ? '有' : '无'}\nimages: ${guide.images ? guide.images.length : 0} 张`,
          showCancel: false
        });
      }
    } catch (err) {
      console.error('错误:', err);
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  }
});
