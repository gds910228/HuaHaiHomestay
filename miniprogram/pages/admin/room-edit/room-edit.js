// pages/admin/room-edit/room-edit.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    roomId: '', // 如果有值则为编辑模式，否则为新增模式
    isEdit: false,
    loading: false,
    saving: false,

    imageUrlInput: '', // 手动输入的图片URL

    // 基本信息
    formData: {
      roomType: '',
      roomCategory: '公寓',
      area: '',
      bedType: '',
      maxGuests: 2,
      allowExtraGuests: false,
      breakfast: '无早餐',
      fixedPrice: '',
      tags: [],
      description: '',
      status: 'available'
    },

    // 图片列表
    images: [], // 已上传的图片URL列表
    maxImages: 15,

    // 入住规则
    checkInRules: {
      checkInTime: '14:00后入住',
      checkOutTime: '12:00前退房',
      cancelPolicy: '30分钟内免费取消',
      deposit: 200,
      instantConfirm: true
    },

    // 接待要求
    guestRequirements: {
      allowInfants: true,
      allowChildren: true,
      allowElderly: true,
      allowOverseas: false,
      allowHKMacaoTaiwan: false,
      allowPets: false,
      allowSmoking: true,
      allowCooking: false,
      allowParty: true,
      allowCommercialShoot: false
    },

    // 详细设施（8大类）
    detailedFacilities: {
      services: [],
      basic: [],
      bathroom: [],
      kitchen: [],
      surroundings: [],
      safety: [],
      entertainment: [],
      leisure: []
    },

    // 设施展开控制
    showFacilities: {},

    // 房间类型选项
    roomCategoryOptions: ['公寓', '套房', '标准间', '别墅'],

    // 早餐选项
    breakfastOptions: ['无早餐', '含早餐', '付费早餐'],

    // 标签输入
    tagInput: '',

    // 设施预设选项（用于快速添加）
    facilityOptions: {
      services: [
        '免费停车位', '付费停车位', '行李寄存', '管家式服务', '前台接待',
        '机场接送', '接站服务', '婴儿托管', '客房服务', '叫醒服务'
      ],
      basic: [
        '无线网络', '电梯', '落地窗', '冷暖空调', '暖气', '晾衣架',
        '电热水壶', '沙发', '电视', '冰箱', '洗衣机', '免费瓶装水',
        '书桌', '衣柜', '暖气片', '加湿器'
      ],
      bathroom: [
        '一次性拖鞋', '热水', '独立卫浴', '电吹风', '洗浴用品',
        '牙具', '浴巾', '毛巾', '干湿分离', '浴缸', '马桶',
        '智能马桶', '淋浴间'
      ],
      kitchen: [
        '微波炉', '餐具', '刀具菜板', '烹饪锅具', '电磁炉',
        '燃气灶', '洗涤用品', '冰箱', '电饭煲', '咖啡机',
        '烤箱', '榨汁机'
      ],
      surroundings: [
        '超市', '便利店', '餐厅', '药店', '公园', '海滩',
        '儿童乐园', '充电桩', '银行', '医院', '地铁站',
        '公交站', '火车站'
      ],
      safety: [
        '急救包', '智能门锁', '门禁卡', '保安', '火灾警报器',
        '灭火器', '急救箱', '烟雾报警器', '安全监控系统'
      ],
      entertainment: [
        '投影设备', '音响', '读书品茶', '游戏机', '棋牌桌',
        '台球桌', '乒乓球', '健身房', 'KTV', '影音室'
      ],
      leisure: [
        '落地窗', '儿童防护设施', '阳台', '露台', '花园',
        '泳池', '温泉', '桑拿', 'SPA', '瑜伽室'
      ]
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;

    if (id) {
      // 编辑模式
      this.setData({
        roomId: id,
        isEdit: true
      });
      this.loadRoomDetail(id);
    } else {
      // 新增模式
      this.setData({
        isEdit: false
      });
    }

    // 初始化设施展开状态
    const showFacilities = {};
    const categories = ['services', 'basic', 'bathroom', 'kitchen', 'surroundings', 'safety', 'entertainment', 'leisure'];
    categories.forEach(cat => {
      showFacilities[cat] = true; // 默认展开
    });
    this.setData({ showFacilities });
  },

  /**
   * 加载房型详情（编辑模式）
   */
  async loadRoomDetail(roomId) {
    try {
      wx.showLoading({ title: '加载中...' });

      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getRoomDetail',
          roomId: roomId
        }
      });

      wx.hideLoading();

      if (res.result.success && res.result.data) {
        const room = res.result.data;

        // 确保detailedFacilities的所有类别都被正确初始化为数组
        const defaultFacilities = {
          services: [],
          basic: [],
          bathroom: [],
          kitchen: [],
          surroundings: [],
          safety: [],
          entertainment: [],
          leisure: []
        };

        const loadedFacilities = room.detailedFacilities || {};
        const detailedFacilities = {};
        const categories = ['services', 'basic', 'bathroom', 'kitchen', 'surroundings', 'safety', 'entertainment', 'leisure'];

        categories.forEach(cat => {
          detailedFacilities[cat] = Array.isArray(loadedFacilities[cat]) ? loadedFacilities[cat] : [];
        });

        console.log('加载的设施数据:', detailedFacilities);

        this.setData({
          formData: {
            roomType: room.roomType || '',
            roomCategory: room.roomCategory || '公寓',
            area: room.area || '',
            bedType: room.bedType || '',
            maxGuests: room.maxGuests || 2,
            allowExtraGuests: room.allowExtraGuests || false,
            breakfast: room.breakfast || '无早餐',
            fixedPrice: room.fixedPrice || '',
            tags: room.tags || [],
            description: room.description || '',
            status: room.status || 'available'
          },
          images: room.images || [],
          checkInRules: {
            checkInTime: room.checkInRules?.checkInTime || '14:00后入住',
            checkOutTime: room.checkInRules?.checkOutTime || '12:00前退房',
            cancelPolicy: room.checkInRules?.cancelPolicy || '30分钟内免费取消',
            deposit: room.checkInRules?.deposit || 200,
            instantConfirm: room.checkInRules?.instantConfirm !== false
          },
          guestRequirements: room.guestRequirements || this.data.guestRequirements,
          detailedFacilities: detailedFacilities
        });
      } else {
        throw new Error(res.result.errMsg || '加载失败');
      }
    } catch (err) {
      console.error('加载房型详情失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 表单输入变化
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 数字输入变化
   */
  onNumberChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = parseInt(e.detail.value) || 0;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 开关变化
   */
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 房间类型选择
   */
  onRoomCategoryChange(e) {
    const index = e.detail.value;
    this.setData({
      'formData.roomCategory': this.data.roomCategoryOptions[index]
    });
  },

  /**
   * 早餐选项选择
   */
  onBreakfastChange(e) {
    const index = e.detail.value;
    this.setData({
      'formData.breakfast': this.data.breakfastOptions[index]
    });
  },

  /**
   * 房间状态选择
   */
  onStatusChange(e) {
    const statusOptions = ['available', 'unavailable', 'maintenance'];
    const index = e.detail.value;
    this.setData({
      'formData.status': statusOptions[index]
    });
  },

  /**
   * 标签输入
   */
  onTagInput(e) {
    this.setData({
      tagInput: e.detail.value
    });
  },

  /**
   * 添加标签
   */
  addTag() {
    const tag = this.data.tagInput.trim();
    if (!tag) {
      return;
    }

    const tags = this.data.formData.tags || [];
    if (tags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }

    if (tags.length >= 10) {
      wx.showToast({
        title: '最多添加10个标签',
        icon: 'none'
      });
      return;
    }

    tags.push(tag);
    this.setData({
      'formData.tags': tags,
      tagInput: ''
    });
  },

  /**
   * 删除标签
   */
  deleteTag(e) {
    const { index } = e.currentTarget.dataset;
    const tags = this.data.formData.tags;
    tags.splice(index, 1);

    this.setData({
      'formData.tags': tags
    });
  },

  /**
   * 选择图片
   */
  async chooseImage() {
    const { images, maxImages } = this.data;

    if (images.length >= maxImages) {
      wx.showToast({
        title: `最多上传${maxImages}张图片`,
        icon: 'none'
      });
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count: maxImages - images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      const tempFiles = res.tempFiles.map(file => file.tempFilePath);

      // 显示上传中提示
      wx.showLoading({ title: '上传中...' });

      // 上传图片到云存储
      const uploadPromises = tempFiles.map(tempFilePath => this.uploadImage(tempFilePath));
      const uploadedUrls = await Promise.all(uploadPromises);

      wx.hideLoading();

      // 添加到图片列表
      this.setData({
        images: [...images, ...uploadedUrls]
      });

      wx.showToast({
        title: `成功上传${uploadedUrls.length}张`,
        icon: 'success'
      });
    } catch (err) {
      console.error('选择图片失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    }
  },

  /**
   * 上传单张图片到云存储
   */
  async uploadImage(tempFilePath) {
    try {
      console.log('开始上传图片:', tempFilePath);

      // 生成随机文件名
      const random = Math.random().toString(36).substring(2, 15);
      const cloudPath = `room-images/${Date.now()}-${random}.jpg`;

      console.log('云存储路径:', cloudPath);

      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });

      console.log('上传结果:', res);

      // 检查上传是否成功
      // 云存储返回 statusCode: 204 表示成功（No Content）， errMsg: "cloud.uploadFile:ok" 也表示成功
      if (res.errMsg === 'cloud.uploadFile:ok' || res.statusCode === 200 || res.statusCode === 204) {
        if (res.fileID) {
          console.log('✅ 上传成功，fileID:', res.fileID);
          return res.fileID;
        } else {
          throw new Error('上传成功但未返回fileID');
        }
      } else {
        const errMsg = `上传失败，状态码: ${res.statusCode}, 错误: ${res.errMsg}`;
        console.error(errMsg, res);
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('上传图片异常:', err);

      // 提供更友好的错误提示
      let errorMsg = '上传失败';
      if (err.errMsg) {
        if (err.errMsg.includes('permission')) {
          errorMsg = '没有云存储权限，请检查云存储配置';
        } else if (err.errMsg.includes('quota')) {
          errorMsg = '云存储空间不足';
        } else if (err.errMsg.includes('file')) {
          errorMsg = '文件格式不支持';
        } else if (err.message) {
          errorMsg = err.message;
        } else {
          errorMsg = err.errMsg;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      throw new Error(errorMsg);
    }
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.images
    });
  },

  /**
   * 删除图片
   */
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images;
    images.splice(index, 1);

    this.setData({
      images: images
    });
  },

  /**
   * 图片URL输入
   */
  onImageUrlInput(e) {
    this.setData({
      imageUrlInput: e.detail.value
    });
  },

  /**
   * 添加图片URL
   */
  addImageUrl() {
    const url = this.data.imageUrlInput.trim();

    if (!url) {
      wx.showToast({
        title: '请输入图片URL',
        icon: 'none'
      });
      return;
    }

    // 验证URL格式
    if (!url.startsWith('cloud://') && !url.startsWith('http://') && !url.startsWith('https://')) {
      wx.showToast({
        title: '请输入有效的图片URL',
        icon: 'none'
      });
      return;
    }

    if (this.data.images.length >= this.data.maxImages) {
      wx.showToast({
        title: `最多添加${this.data.maxImages}张图片`,
        icon: 'none'
      });
      return;
    }

    // 检查是否已存在
    if (this.data.images.includes(url)) {
      wx.showToast({
        title: '图片已存在',
        icon: 'none'
      });
      return;
    }

    // 添加图片URL
    this.setData({
      images: [...this.data.images, url],
      imageUrlInput: ''
    });

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  /**
   * 切换设施分类展开/收起
   */
  toggleFacilityCategory(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({
      [`showFacilities.${category}`]: !this.data.showFacilities[category]
    });
  },

  /**
   * 切换设施选项
   */
  toggleFacility(e) {
    console.log('=== toggleFacility 被调用 ===');
    const { category, facility } = e.currentTarget.dataset;
    console.log('点击的设施类别:', category);
    console.log('点击的设施名称:', facility);

    const facilities = this.data.detailedFacilities[category];
    console.log('当前类别的设施列表:', facilities);
    console.log('detailedFacilities 完整数据:', this.data.detailedFacilities);

    if (!facilities) {
      console.error('设施类别不存在:', category);
      wx.showToast({
        title: '设施类别初始化错误',
        icon: 'none'
      });
      return;
    }

    const index = facilities.indexOf(facility);
    console.log('设施在列表中的索引:', index);

    if (index > -1) {
      // 已存在，移除
      facilities.splice(index, 1);
      console.log('移除设施后的列表:', facilities);
    } else {
      // 不存在，添加
      facilities.push(facility);
      console.log('添加设施后的列表:', facilities);
    }

    this.setData({
      [`detailedFacilities.${category}`]: facilities
    });

    console.log('setData 完成，新的 detailedFacilities:', this.data.detailedFacilities);
  },

  /**
   * 入住规则输入变化
   */
  onCheckInRuleChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`checkInRules.${field}`]: value
    });
  },

  /**
   * 押金数字输入
   */
  onDepositChange(e) {
    const value = parseInt(e.detail.value) || 0;
    this.setData({
      'checkInRules.deposit': value
    });
  },

  /**
   * 立即确认开关
   */
  onInstantConfirmChange(e) {
    this.setData({
      'checkInRules.instantConfirm': e.detail.value
    });
  },

  /**
   * 接待要求开关变化
   */
  onGuestRequirementChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`guestRequirements.${field}`]: value
    });
  },

  /**
   * 保存房型
   */
  async saveRoom() {
    // 验证表单
    const { formData, images, checkInRules, guestRequirements, detailedFacilities } = this.data;

    if (!formData.roomType.trim()) {
      wx.showToast({
        title: '请输入房型名称',
        icon: 'none'
      });
      return;
    }

    if (!formData.area.trim()) {
      wx.showToast({
        title: '请输入房间面积',
        icon: 'none'
      });
      return;
    }

    if (!formData.bedType.trim()) {
      wx.showToast({
        title: '请输入床型',
        icon: 'none'
      });
      return;
    }

    if (!formData.fixedPrice || formData.fixedPrice <= 0) {
      wx.showToast({
        title: '请输入有效价格',
        icon: 'none'
      });
      return;
    }

    if (images.length === 0) {
      wx.showToast({
        title: '请至少上传1张图片',
        icon: 'none'
      });
      return;
    }

    // 准备保存数据
    const roomData = {
      ...formData,
      images: images,
      checkInRules: checkInRules,
      guestRequirements: guestRequirements,
      detailedFacilities: detailedFacilities,
      // 兼容旧字段
      facilities: [
        ...(detailedFacilities.basic || []),
        ...(detailedFacilities.bathroom || [])
      ].slice(0, 10) // 取前10项作为简化设施列表
    };

    try {
      this.setData({ saving: true });
      wx.showLoading({ title: '保存中...' });

      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminSaveRoom',
          id: this.data.roomId || null, // 编辑模式传ID，新增模式不传
          ...roomData
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({
          title: this.data.isEdit ? '更新成功' : '添加成功',
          icon: 'success',
          duration: 2000
        });

        // 延迟返回
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.result.errMsg || '保存失败');
      }
    } catch (err) {
      console.error('保存房型失败:', err);
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      });
    }
  }
});
