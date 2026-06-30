// pages/admin/guides/index.js
// 筛选选项：index 与实际取值/展示文案的映射
const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' }
];

const CATEGORY_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'food', label: '美食推荐' },
  { value: 'route', label: '南澳玩法' },
  { value: 'info', label: '实用信息' },
  { value: 'spot', label: '景点打卡' }
];

// category 值 → 中文（兼容老数据：库里如果直接存中文也能显示）
const CATEGORY_LABEL_MAP = {
  food: '美食推荐',
  route: '南澳玩法',
  info: '实用信息',
  spot: '景点打卡'
};

Page({
  data: {
    guides: [],
    loading: true,
    filterStatus: '',
    filterCategory: '',
    // 提供给 picker 用的 range（只取 label）
    statusOptions: STATUS_OPTIONS.map(o => o.label),
    categoryOptions: CATEGORY_OPTIONS.map(o => o.label),
    statusIndex: 0,
    categoryIndex: 0,
    statusLabel: '状态筛选',
    categoryLabel: '分类筛选'
  },

  onLoad() {
    this.loadGuides();
  },

  onShow() {
    this.loadGuides();
  },

  // 加载攻略列表
  async loadGuides() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminGetGuides',
          status: this.data.filterStatus || undefined,
          category: this.data.filterCategory || undefined
        }
      });

      if (res.result.success) {
        let rawData = res.result.data || [];

        // ===== 前端兜底过滤（云函数未部署/旧版本时仍能筛选）=====
        if (this.data.filterStatus) {
          rawData = rawData.filter(g => g.status === this.data.filterStatus);
        }
        if (this.data.filterCategory) {
          rawData = rawData.filter(g => g.category === this.data.filterCategory);
        }

        const data = rawData.map(g => ({
          ...g,
          categoryLabel: CATEGORY_LABEL_MAP[g.category] || g.category || '未分类'
        }));
        this.setData({ guides: data });
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

  // 新增攻略
  addGuide() {
    wx.navigateTo({
      url: '/pages/admin/guide-edit/index'
    });
  },

  // 编辑攻略
  editGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/guide-edit/index?id=${id}`
    });
  },

  // 删除攻略
  deleteGuide(e) {
    const { id, title } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: `确定删除"${title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const response = await wx.cloud.callFunction({
              name: 'huahai',
              data: {
                type: 'adminDeleteGuide',
                id
              }
            });

            wx.hideLoading();

            if (response.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadGuides();
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
  },

  // 切换发布状态
  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === 'published' ? 'draft' : 'published';

    wx.showLoading({ title: '更新中...' });

    try {
      await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminSaveGuide',
          id,
          status: newStatus
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
      this.loadGuides();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  },

  // 筛选
  onFilterChange(e) {
    const { field } = e.currentTarget.dataset;
    const index = Number(e.detail.value) || 0;

    if (field === 'status') {
      const opt = STATUS_OPTIONS[index] || STATUS_OPTIONS[0];
      this.setData({
        filterStatus: opt.value,
        statusIndex: index,
        statusLabel: index === 0 ? '状态筛选' : opt.label
      });
    } else if (field === 'category') {
      const opt = CATEGORY_OPTIONS[index] || CATEGORY_OPTIONS[0];
      this.setData({
        filterCategory: opt.value,
        categoryIndex: index,
        categoryLabel: index === 0 ? '分类筛选' : opt.label
      });
    }

    this.loadGuides();
  }
});
