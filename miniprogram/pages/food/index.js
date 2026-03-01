// pages/food/index.js
Page({
  data: {
    guides: [],
    groupedGuides: {},
    loading: false,
    currentTab: 0,  // 当前选中的选项卡索引
    tabs: []  // 选项卡列表
  },

  onLoad() {
    this.loadGuides();
  },

  onShow() {
    this.loadGuides();
  },

  // 加载美食数据
  async loadGuides() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      console.log('[美食页面] 开始加载数据...');
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getGuides',
          category: 'food',
          pageSize: 100
        }
      });

      console.log('[美食页面] 云函数返回结果:', res);

      if (res.result && res.result.success) {
        const guides = res.result.data || [];
        console.log('[美食页面] 获取到美食数据:', guides.length, '条');

        // 调试：打印每个店铺的图片信息
        guides.forEach((guide, index) => {
          const hasImages = guide.images && guide.images.length > 0;
          console.log(`[调试] 店铺${index + 1}: ${guide.title}`);
          console.log(`  cover: "${guide.cover}"`);
          console.log(`  images:`, guide.images);
          console.log(`  images.length: ${guide.images ? guide.images.length : 0}`);
          console.log(`  有图片: ${hasImages ? '是' : '否'}`);
        });

        const grouped = this.groupGuidesByArea(guides);
        console.log('[美食页面] 分组结果:', grouped);

        // 构建选项卡列表
        const tabs = [
          { key: '后宅镇', name: '后宅镇', icon: '📍', count: grouped['后宅镇'].length },
          { key: '青澳湾', name: '青澳湾', icon: '🌊', count: grouped['青澳湾'].length },
          { key: '云澳镇', name: '云澳镇', icon: '🏖', count: grouped['云澳镇'].length }
        ].filter(tab => tab.count > 0);  // 只显示有数据的选项卡

        console.log('[美食页面] 选项卡列表:', tabs);

        this.setData({
          guides,
          groupedGuides: grouped,
          tabs: tabs,
          loading: false
        });

        if (guides.length === 0) {
          wx.showToast({
            title: '暂无美食数据',
            icon: 'none'
          });
        }
      } else {
        console.error('[美食页面] 云函数返回失败:', res.result);
        wx.showToast({
          title: res.result?.errMsg || '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('[美食页面] 加载美食失败:', err);
      wx.showToast({
        title: '加载失败: ' + (err.errMsg || err.message),
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  // 切换选项卡
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentTab: index
    });
  },

  // 按区域分组
  groupGuidesByArea(guides) {
    const groups = {
      '后宅镇': [],
      '青澳湾': [],
      '云澳镇': []
    };

    console.log('[分组] 开始分组，总数据:', guides.length);

    // 定义每个区域的关键词列表
    const areaKeywords = {
      '青澳湾': [
        '青澳湾', '青澳', '北回归线广场', '青澳后窑', '青澳深青',
        '青澳文昌', '青澳锦骏', '青澳黄金海岸', '环岛东路',
        '海湾路', '海上东方'
      ],
      '云澳镇': [
        '云澳镇', '云澳', '台湾街', '云星华府'
      ],
      '后宅镇': [
        '后宅镇', '后宅', '龙滨路', '金龙路', '崇文路', '海滨路',
        '山顶市场', '隆澳堂', '维也纳酒店', '大圆新村', '国信大楼',
        '南光新村', '中心幼儿园', '龙地村'
      ]
    };

    guides.forEach((guide, index) => {
      console.log(`[分组] 第${index}条数据:`, {
        title: guide.title,
        address: guide.address
      });

      const address = guide.address || '';
      let area = '后宅镇'; // 默认后宅镇

      // 优先匹配青澳湾
      for (const keyword of areaKeywords['青澳湾']) {
        if (address.includes(keyword)) {
          area = '青澳湾';
          break;
        }
      }

      // 如果不是青澳湾，检查是否为云澳镇
      if (area === '后宅镇') {
        for (const keyword of areaKeywords['云澳镇']) {
          if (address.includes(keyword)) {
            area = '云澳镇';
            break;
          }
        }
      }

      console.log(`[分组] 第${index}条归类为: ${area}`);
      groups[area].push(guide);
    });

    console.log('[分组] 分组结果:', {
      后宅镇: groups['后宅镇'].length,
      青澳湾: groups['青澳湾'].length,
      云澳镇: groups['云澳镇'].length
    });

    return groups;
  },

  // 查看攻略详情
  viewGuide(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/guide-detail/index?id=${id}`
    });
  },

  // 预览图片
  previewImage(e) {
    const { url, images } = e.currentTarget.dataset;

    // 如果有 images 数组，使用它；否则用单个图片
    const imageUrls = images && images.length > 0 ? images : [url];

    wx.previewImage({
      current: url,
      urls: imageUrls
    });
  },

  // 一键导航
  navigate(e) {
    const { latitude, longitude, title, address } = e.currentTarget.dataset;

    if (!latitude || !longitude) {
      wx.showToast({
        title: '暂无位置信息',
        icon: 'none'
      });
      return;
    }

    wx.openLocation({
      latitude,
      longitude,
      name: title,
      address: address || title
    });
  }
});
