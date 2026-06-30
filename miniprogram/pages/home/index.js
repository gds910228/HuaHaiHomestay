// pages/home/index.js
// SVG icon data URIs (inline so we don't need external icon files)
const ICON_FOOD = "data:image/svg+xml;utf8,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C75B39' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3 v 10 a 3 3 0 0 0 6 0 v -10'/%3E%3Cpath d='M9 13 v 8'/%3E%3Cpath d='M18 3 c -2 0 -3 2 -3 5 v 4 h 3 v 9'/%3E%3C/svg%3E";

const ICON_ROUTE = "data:image/svg+xml;utf8,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233E7A6E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='6' cy='5' r='2'/%3E%3Ccircle cx='18' cy='19' r='2'/%3E%3Cpath d='M6 7 c 0 4 12 4 12 10' stroke-dasharray='3 3'/%3E%3C/svg%3E";

const ICON_INFO = "data:image/svg+xml;utf8,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238B6F3F' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 4 h 12 a 2 2 0 0 1 2 2 v 14 l -8 -4 -8 4 z'/%3E%3Cpath d='M9 9 h 6 M 9 13 h 4' opacity='0.7'/%3E%3C/svg%3E";

const ICON_SPOT = "data:image/svg+xml;utf8,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231E5266' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22 s -7 -7 -7 -13 a 7 7 0 0 1 14 0 c 0 6 -7 13 -7 13 z'/%3E%3Ccircle cx='12' cy='9' r='2.4'/%3E%3C/svg%3E";

Page({
  data: {
    categories: [
      { id: 'spot',  name: '景点打卡', desc: 'TOP · 必去地标',     iconSrc: ICON_SPOT  },
      { id: 'food',  name: '南澳味道', desc: 'TASTE · 海鲜与小食',  iconSrc: ICON_FOOD  },
      { id: 'route', name: '南澳玩法', desc: 'PLAY · 环岛慢行',    iconSrc: ICON_ROUTE },
      { id: 'info',  name: '实用信息', desc: 'GUIDE · 出行须知',    iconSrc: ICON_INFO  }
    ]
  },

  onLoad() {},

  navigateToCategory(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/${id}/index` });
  },

  navigateToHostel() {
    wx.switchTab({ url: '/pages/hostel/index' });
  },

  onShareAppMessage() {
    return {
      title: '画海 · 南澳岛旅行手记',
      path: '/pages/home/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '画海 · 南澳岛旅行手记',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
