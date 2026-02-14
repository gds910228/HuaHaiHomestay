// pages/home/index.js
Page({
  data: {
    categories: [
      { id: 'food', name: '美食推荐', icon: '🍴', desc: '本地人推荐的23家餐厅', color: '#FF6B35' },
      { id: 'route', name: '游玩路线', icon: '🗺️', desc: '环岛游玩攻略路线', color: '#4CAF50' },
      { id: 'info', name: '实用信息', icon: '📝', desc: '南澳岛旅游指南', color: '#2196F3' },
      { id: 'spot', name: '景点打卡', icon: '📍', desc: '南澳岛热门景点', color: '#FF9800' }
    ]
  },

  onLoad() {
    // 页面加载完成，初始化操作
  },

  // 跳转到分类页面
  navigateToCategory(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/${id}/index`
    });
  }
});
