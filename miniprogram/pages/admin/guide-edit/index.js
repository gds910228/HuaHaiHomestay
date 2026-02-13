// pages/admin/guide-edit/index.js
Page({
  data: {
    id: '',
    isEdit: false,
    form: {
      title: '',
      category: 'food',
      tags: [],
      cover: '',
      images: [],
      summary: '',
      content: '',
      address: '',
      info: []
    },
    categories: [
      { value: 'food', label: '美食推荐' },
      { value: 'route', label: '游玩路线' },
      { value: 'spot', label: '景点打卡' },
      { value: 'info', label: '实用信息' }
    ],
    uploading: false,
    categoryLabel: '美食推荐' // 新增：用于显示当前选择的分类
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      this.loadGuide();
    }
  },

  // 加载攻略数据
  async loadGuide() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'getGuideById',
          id: this.data.id
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const guide = res.result.data;
        const categories = this.data.categories;
        const categoryLabel = categories.find(c => c.value === guide.category)?.label || '美食推荐';

        this.setData({
          form: {
            title: guide.title,
            category: guide.category,
            tags: guide.tags || [],
            cover: guide.cover,
            images: guide.images || [],
            summary: guide.summary,
            content: guide.content,
            address: guide.address || '',
            info: guide.info || []
          },
          categoryLabel
        });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 表单输入
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },

  // 分类选择
  onCategoryChange(e) {
    const index = e.detail.value;
    const selected = this.data.categories[index];
    this.setData({
      'form.category': selected.value,
      categoryLabel: selected.label
    });
  },

  // 标签输入
  onTagsInput(e) {
    const value = e.detail.value;
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    this.setData({ 'form.tags': tags });
  },

  // 上传封面图
  async chooseCover() {
    if (this.data.uploading) return;

    try {
      this.setData({ uploading: true });

      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      const tempFilePath = res.tempFiles[0].tempFilePath;

      wx.showLoading({ title: '上传中...' });

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `guides/covers/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: tempFilePath
      });

      // 获取文件地址
      const fileRes = await wx.cloud.getTempFileURL({
        fileList: [uploadRes.fileID]
      });

      wx.hideLoading();

      this.setData({
        'form.cover': uploadRes.fileID,
        uploading: false
      });

      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      this.setData({ uploading: false });
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  // 上传多张图片
  async chooseImages() {
    if (this.data.uploading) return;

    try {
      this.setData({ uploading: true });

      const res = await wx.chooseMedia({
        count: 9 - this.data.form.images.length,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      wx.showLoading({ title: '上传中...' });

      const uploadPromises = res.tempFiles.map(async (file) => {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `guides/images/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: file.tempFilePath
        });
        return uploadRes.fileID;
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      wx.hideLoading();

      this.setData({
        'form.images': [...this.data.form.images, ...uploadedFiles],
        uploading: false
      });

      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      this.setData({ uploading: false });
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  // 预览图片
  previewImage(e) {
    const { url, type } = e.currentTarget.dataset;

    if (type === 'cover') {
      wx.previewImage({
        current: this.data.form.cover,
        urls: [this.data.form.cover]
      });
    } else {
      const { index } = e.currentTarget.dataset;
      wx.previewImage({
        current: this.data.form.images[index],
        urls: this.data.form.images
      });
    }
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.form.images];
    images.splice(index, 1);
    this.setData({ 'form.images': images });
  },

  // 删除封面
  deleteCover() {
    this.setData({ 'form.cover': '' });
  },

  // 保存攻略
  async save() {
    const { form } = this.data;

    // 验证
    if (!form.title) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    if (!form.summary) {
      wx.showToast({ title: '请输入摘要', icon: 'none' });
      return;
    }

    if (!form.content) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: this.data.isEdit ? 'adminSaveGuide' : 'adminAddGuide',
          ...form,
          id: this.data.id || undefined
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.result.errMsg || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
