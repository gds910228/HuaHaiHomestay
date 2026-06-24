// pages/food/index.js
Page({
  data: {
    guides: [],
    groupedGuides: {},
    loading: false,
    isFirstLoad: true,  // 首次加载标记
    currentTab: 0,  // 当前选中的选项卡索引
    tabs: [],  // 选项卡列表

    // ===== 标签筛选 =====
    tagOptions: [],     // 该分类下的全部标签 [{name, count}]
    activeTag: '',      // 当前选中的标签，空字符串表示全部
    tagsExpanded: false // 标签栏是否展开（默认收起为两行）
  },

  onLoad() {
    this.loadTagOptions();
    this.loadGuides();
  },

  onShow() {
    this.loadGuides();
  },

  // 加载该分类下的可选标签
  async loadTagOptions() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: { type: 'getAllTags', category: 'food' }
      });
      if (res.result && res.result.success) {
        this.setData({
          tagOptions: res.result.data || []
        });
      }
    } catch (err) {
      console.warn('[美食页面] 加载标签失败', err);
    }
  },

  // 选中/取消选中某个标签
  selectTag(e) {
    const tag = e.currentTarget.dataset.tag || '';
    if (tag === this.data.activeTag) {
      this.setData({ activeTag: '' });
    } else {
      this.setData({ activeTag: tag });
    }
    this.loadGuides();
  },

  // 展开/收起标签栏
  toggleTagsExpanded() {
    this.setData({ tagsExpanded: !this.data.tagsExpanded });
  },

  // 加载美食数据
  async loadGuides() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      console.log('[美食页面] 开始加载数据...');
      const callData = {
        type: 'getGuides',
        category: 'food',
        pageSize: 100
      };
      if (this.data.activeTag) {
        callData.tag = this.data.activeTag;
      }

      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: callData
      });

      console.log('[美食页面] 云函数返回结果:', res);

      if (res.result && res.result.success) {
        let guides = res.result.data || [];
        console.log('[美食页面] 云函数返回:', guides.length, '条，activeTag=', this.data.activeTag);

        // ===== 前端兜底过滤 =====
        // 0) 严格按分类过滤（云函数若未重新部署、category 参数未生效时兜底）
        const beforeCat = guides.length;
        guides = guides.filter(g => g.category === 'food');
        if (guides.length !== beforeCat) {
          console.log('[美食页面] 兜底按分类过滤:', beforeCat, '→', guides.length);
        }

        // 1) 只展示已发布的
        const beforeStatus = guides.length;
        guides = guides.filter(g => !g.status || g.status === 'published');
        if (guides.length !== beforeStatus) {
          console.log('[美食页面] 兜底按发布状态过滤:', beforeStatus, '→', guides.length);
        }

        // 2) 按标签过滤（云函数若未部署/筛选未生效时兜底）
        if (this.data.activeTag) {
          const t = this.data.activeTag;
          const before = guides.length;
          guides = guides.filter(g => Array.isArray(g.tags) && g.tags.indexOf(t) > -1);
          console.log('[美食页面] 兜底按标签过滤:', t, before, '→', guides.length);
        }

        // 预处理：判断每个店铺是否有真实图片（非占位图）
        guides.forEach((guide) => {
          const hasImages = guide.images && guide.images.length > 0;
          const firstImage = hasImages ? guide.images[0] : '';
          const isPlaceholder = firstImage && firstImage.includes('placeholder');

          // 添加一个新字段用于判断是否有真实图片
          guide.hasRealImage = hasImages && !isPlaceholder;

          console.log(`[调试] ${guide.title}:`);
          console.log(`  images.length: ${guide.images ? guide.images.length : 0}`);
          console.log(`  第一张图包含placeholder: ${isPlaceholder ? '是' : '否'}`);
          console.log(`  有真实图片: ${guide.hasRealImage ? '是' : '否'}`);
        });

        // 检查收藏状态
        await this.checkFavoritesStatus(guides);

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
          loading: false,
          isFirstLoad: false  // 首次加载完成
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
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

  // 图片加载成功
  onImageLoad(e) {
    console.log('[美食] 图片加载成功:', e.detail);
  },

  // 图片加载失败
  onImageError(e) {
    console.log('[美食] 图片加载失败:', e.detail);
  },

  // 批量检查收藏状态
  async checkFavoritesStatus(guides) {
    try {
      // 获取所有收藏记录
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getFavorites'
        }
      });

      if (res.result.success && res.result.data) {
        const favorites = res.result.data;

        // 为每个guide设置收藏状态
        guides.forEach(guide => {
          const isFavorited = favorites.some(fav =>
            fav.guideId === guide._id && fav.category === 'guide'
          );
          guide.isFavorited = isFavorited;
        });

        console.log('[美食] 收藏状态检查完成');
      }
    } catch (err) {
      console.error('[美食] 检查收藏状态失败:', err);
    }
  },

  // 切换收藏状态
  async toggleFavorite(e) {
    const { id } = e.currentTarget.dataset;

    if (!id) return;

    try {
      wx.showLoading({ title: '处理中...', mask: true });

      // 调用云函数切换收藏
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'toggleFavorite',
          guideId: id,
          category: 'guide'
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const { isFavorited } = res.result.data;

        // 更新本地数据
        const guides = this.data.guides.map(guide => {
          if (guide._id === id) {
            return { ...guide, isFavorited };
          }
          return guide;
        });

        // 更新分组数据
        const groupedGuides = { ...this.data.groupedGuides };
        Object.keys(groupedGuides).forEach(key => {
          groupedGuides[key] = groupedGuides[key].map(guide => {
            if (guide._id === id) {
              return { ...guide, isFavorited };
            }
            return guide;
          });
        });

        this.setData({
          guides,
          groupedGuides
        });

        wx.showToast({
          title: isFavorited ? '已收藏' : '已取消收藏',
          icon: 'success'
        });
      } else {
        throw new Error('操作失败');
      }
    } catch (err) {
      console.error('[美食] 收藏操作失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '南澳岛美食推荐 - 画海民宿',
      path: '/pages/food/index',
      imageUrl: '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '南澳岛美食推荐 - 画海民宿',
      query: '',
      imageUrl: '/images/logo.jpg'
    };
  }
});
