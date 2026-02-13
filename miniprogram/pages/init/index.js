// pages/init/index.js - 数据库初始化页面
Page({
  data: {
    logs: [],
    loading: false
  },

  onLoad() {
    this.addLog('📋 数据库初始化工具');
    this.addLog('━━━━━━━━━━━━━━━━');
    this.addLog('提示：此页面用于初始化数据库数据');
    this.addLog('');
  },

  // 添加日志
  addLog(message) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    this.setData({
      logs: [`[${time}] ${message}`, ...this.data.logs]
    });
  },

  // 初始化所有数据
  async initAll() {
    if (this.data.loading) return;

    wx.showModal({
      title: '确认操作',
      content: '确定要初始化所有数据吗？这将添加民宿信息、房型和示例攻略。',
      success: async (res) => {
        if (res.confirm) {
          await this.executeInit('initAll', '全部数据');
        }
      }
    });
  },

  // 只初始化民宿信息
  async initHostel() {
    if (this.data.loading) return;
    await this.executeInit('initHostel', '民宿信息');
  },

  // 只初始化房型
  async initRooms() {
    if (this.data.loading) return;
    await this.executeInit('initRooms', '房型数据');
  },

  // 只初始化攻略
  async initGuides() {
    if (this.data.loading) return;
    await this.executeInit('initGuides', '攻略数据');
  },

  // 初始化美食攻略数据
  async initFood() {
    if (this.data.loading) return;
    await this.executeInit('initFood', '美食攻略数据');
  },

  // 清空所有数据
  async clearAll() {
    if (this.data.loading) return;

    wx.showModal({
      title: '⚠️ 危险操作',
      content: '确定要清空所有数据吗？此操作不可恢复！',
      confirmText: '确定清空',
      confirmColor: '#F44336',
      success: async (res) => {
        if (res.confirm) {
          await this.executeInit('clearAll', '清空数据');
        }
      }
    });
  },

  // 执行初始化
  async executeInit(type, name) {
    this.setData({ loading: true });
    this.addLog(`🚀 开始初始化${name}...`);

    wx.showLoading({
      title: '正在执行...',
      mask: true
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'init-database',
        data: {
          type,
          password: 'huahai2026'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        this.addLog(`✅ ${res.result.message || '执行成功'}`);
        if (res.result.data) {
          if (res.result.data.count !== undefined) {
            this.addLog(`📊 影响记录数: ${res.result.data.count}`);
          }
        }
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
      } else {
        this.addLog(`❌ ${res.result.errMsg || '执行失败'}`);
        wx.showToast({
          title: res.result.errMsg || '执行失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      this.addLog(`❌ 执行出错: ${err.errMsg || err.message}`);
      wx.showToast({
        title: '执行出错',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 清空日志
  clearLogs() {
    this.setData({
      logs: []
    });
    this.addLog('📋 日志已清空');
  },

  // 跳转到管理后台首页
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/index'
    });
  },

  // 跳转到攻略管理（快速编辑入口）
  goToAdminGuides() {
    wx.navigateTo({
      url: '/pages/admin/guides/index'
    });
  },

  // 跳转到首页
  goHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  }
});
