// pages/info/index.js
Page({
  data: {
    category: {
      id: 'info',
      name: '实用信息',
      icon: '📝',
      desc: '南澳岛旅游指南',
      color: '#2196F3'
    }
  },

  onLoad() {

  },

  onShow() {

  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '南澳岛旅游实用信息 - 画海民宿',
      path: '/pages/info/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '南澳岛旅游实用信息 - 画海民宿',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
