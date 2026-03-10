// pages/route/index.js
Page({
  data: {
    category: {
      id: 'route',
      name: '游玩路线',
      icon: '🗺️',
      desc: '环岛游玩攻略路线',
      color: '#4CAF50'
    }
  },

  onLoad() {

  },

  onShow() {

  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '南澳岛游玩路线推荐 - 画海民宿',
      path: '/pages/route/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '南澳岛游玩路线推荐 - 画海民宿',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
