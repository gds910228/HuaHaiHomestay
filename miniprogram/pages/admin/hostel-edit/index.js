// pages/admin/hostel-edit/index.js
Page({
  data: {
    hostelId: '',
    isEdit: false,
    loading: false,
    saving: false,

    formData: {
      name: '画海民宿',
      description: '',
      address: '',
      phone: '',
      wechat: '',
      albums: [],
      facilities: []
    },

    // 图片列表
    images: [],
    maxImages: 20,

    imageUrlInput: '', // 手动输入的图片URL

    // 设施选项
    facilityOptions: [
      '免费WiFi', '24小时热水', '空调', '独立卫生间',
      '停车场', '餐厅', '便利店', '接站服务',
      '行李寄存', '早餐', '健身房', '泳池',
      '烧烤', '花园', '露台', '洗衣服务',
      '前台24小时', '安保', '消防设施', '急救包'
    ],

    // 标签输入
    facilityInput: ''
  },

  onLoad(options) {
    // 加载民宿信息
    this.loadHostelInfo();
  },

  /**
   * 加载民宿信息
   */
  async loadHostelInfo() {
    try {
      wx.showLoading({ title: '加载中...' });

      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminGetHostel'
        }
      });

      wx.hideLoading();

      if (res.result.success && res.result.data) {
        const hostel = res.result.data;

        this.setData({
          hostelId: hostel._id || '',
          isEdit: !!hostel._id,
          formData: {
            name: hostel.name || '画海民宿',
            description: hostel.description || '',
            address: hostel.address || '',
            phone: hostel.phone || '',
            wechat: hostel.wechat || '',
            albums: hostel.albums || [],
            facilities: hostel.facilities || []
          },
          images: hostel.albums || []
        });
      }
    } catch (err) {
      console.error('加载民宿信息失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
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
        images: [...images, ...uploadedUrls],
        'formData.albums': [...images, ...uploadedUrls]
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
      // 生成随机文件名
      const random = Math.random().toString(36).substring(2, 15);
      const cloudPath = `hostel-images/${Date.now()}-${random}.jpg`;

      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });

      // 检查上传是否成功
      if (res.errMsg === 'cloud.uploadFile:ok' || res.statusCode === 200 || res.statusCode === 204) {
        if (res.fileID) {
          return res.fileID;
        } else {
          throw new Error('上传成功但未返回fileID');
        }
      } else {
        throw new Error(`上传失败，状态码: ${res.statusCode}`);
      }
    } catch (err) {
      console.error('上传图片异常:', err);
      throw new Error(err.message || '上传失败');
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
      images: images,
      'formData.albums': images
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
    const newImages = [...this.data.images, url];
    this.setData({
      images: newImages,
      imageUrlInput: '',
      'formData.albums': newImages
    });

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  /**
   * 设施输入
   */
  onFacilityInput(e) {
    this.setData({
      facilityInput: e.detail.value
    });
  },

  /**
   * 添加设施
   */
  addFacility() {
    const facility = this.data.facilityInput.trim();
    if (!facility) {
      return;
    }

    const facilities = this.data.formData.facilities || [];
    if (facilities.includes(facility)) {
      wx.showToast({
        title: '设施已存在',
        icon: 'none'
      });
      return;
    }

    if (facilities.length >= 20) {
      wx.showToast({
        title: '最多添加20个设施',
        icon: 'none'
      });
      return;
    }

    facilities.push(facility);
    this.setData({
      'formData.facilities': facilities,
      facilityInput: ''
    });
  },

  /**
   * 删除设施
   */
  deleteFacility(e) {
    const { index } = e.currentTarget.dataset;
    const facilities = this.data.formData.facilities;
    facilities.splice(index, 1);

    this.setData({
      'formData.facilities': facilities
    });
  },

  /**
   * 选择预设设施
   */
  selectFacility(e) {
    const { facility } = e.currentTarget.dataset;
    const facilities = this.data.formData.facilities || [];

    if (facilities.includes(facility)) {
      // 已存在，移除
      facilities.splice(facilities.indexOf(facility), 1);
    } else {
      // 不存在，添加
      facilities.push(facility);
    }

    this.setData({
      'formData.facilities': facilities
    });
  },

  /**
   * 保存民宿信息
   */
  async saveHostel() {
    const { formData, images } = this.data;

    if (!formData.name.trim()) {
      wx.showToast({
        title: '请输入民宿名称',
        icon: 'none'
      });
      return;
    }

    // 准备保存数据
    const hostelData = {
      ...formData,
      albums: images
    };

    try {
      this.setData({ saving: true });
      wx.showLoading({ title: '保存中...' });

      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminSaveHostel',
          id: this.data.hostelId || null,
          ...hostelData
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({
          title: '保存成功',
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
      console.error('保存民宿信息失败:', err);
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      });
    }
  }
});
