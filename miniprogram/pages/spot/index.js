// pages/spot/index.js
Page({
  data: {
    category: {
      id: 'spot',
      name: '景点打卡',
      icon: '📍',
      desc: '南澳岛热门景点',
      color: '#FF9800'
    }
  },

  onLoad() {

  },

  onShow() {

  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '南澳岛热门景点打卡 - 画海民宿',
      path: '/pages/spot/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '南澳岛热门景点打卡 - 画海民宿',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
