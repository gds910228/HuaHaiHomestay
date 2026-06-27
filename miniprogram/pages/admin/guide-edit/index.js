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
      area: '',
      info: []
    },
    categories: [
      { value: 'food', label: '美食推荐' },
      { value: 'route', label: '游玩路线' },
      { value: 'spot', label: '景点打卡' },
      { value: 'info', label: '实用信息' }
    ],
    // 美食专属：区域选项（与首页 food tab 对齐）
    areaOptions: ['', '后宅镇', '青澳湾', '云澳镇'],
    areaIndex: 0,
    uploading: false,
    categoryLabel: '美食推荐',

    // ===== 标签管理 =====
    tagInput: '',          // 当前输入框的内容
    suggestedTags: [],     // 全局已有的标签云（来自云数据库）

    // ===== 富文本编辑器 =====
    editorCtx: null,       // editor 上下文，由 onEditorReady 设置
    editorHeight: 460,     // editor 区域高度（rpx）
    editorFocus: false,
    formats: {}            // 当前光标格式，用于高亮工具栏按钮
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      this.loadGuide();
    }
    this.loadSuggestedTags();
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

        // 诊断:看数据库里到底存了什么
        console.log('[编辑回显] guide.cover:', guide.cover || '(空)');
        console.log('[编辑回显] guide.images:', guide.images);
        console.log('[编辑回显] images 数量:', (guide.images || []).length);

        this.setData({
          form: {
            title: guide.title || '',
            category: guide.category || 'food',
            tags: guide.tags || [],
            cover: guide.cover || '',
            images: guide.images || [],
            summary: guide.summary || '',
            content: guide.content || '',
            address: guide.address || '',
            area: guide.area || '',
            info: guide.info || []
          },
          areaIndex: Math.max(0, this.data.areaOptions.indexOf(guide.area || '')),
          categoryLabel
        });

        // 把内容塞进编辑器：
        // - editor 已 ready：直接 setContents
        // - 还没 ready：放到 _pendingContent，等 onEditorReady 来消费
        const html = guide.content || '';
        if (this.editorCtx) {
          this.editorCtx.setContents({ html });
        } else {
          this._pendingContent = html;
        }
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载已有的标签建议
  async loadSuggestedTags() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: { type: 'getAllTags' }
      });
      if (res.result && res.result.success) {
        this.setData({
          suggestedTags: (res.result.data || []).slice(0, 60)
        });
      }
    } catch (err) {
      console.warn('加载标签建议失败', err);
    }
  },

  // ===== 表单输入 =====
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const selected = this.data.categories[index];
    const next = {
      'form.category': selected.value,
      categoryLabel: selected.label
    };
    // 切换到非美食时，清掉 area，避免脏数据干扰其它分类
    if (selected.value !== 'food') {
      next['form.area'] = '';
      next.areaIndex = 0;
    }
    this.setData(next);
  },

  // 美食专属：选择所属区域
  onAreaChange(e) {
    const index = Number(e.detail.value) || 0;
    const area = this.data.areaOptions[index] || '';
    this.setData({
      areaIndex: index,
      'form.area': area
    });
  },

  // ===== 标签管理 =====
  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  // 按确认键 / 点击 + 按钮添加标签
  addTag(e) {
    // 兼容输入框 confirm 事件 与 button tap
    const inputVal = (e && e.detail && typeof e.detail.value === 'string')
      ? e.detail.value
      : this.data.tagInput;

    const raw = String(inputVal || '').trim();
    if (!raw) return;

    // 支持一次粘贴多个标签（用 , 、空格、中文逗号分隔）
    const parts = raw.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    const tags = [...this.data.form.tags];
    parts.forEach(p => {
      if (!tags.includes(p)) tags.push(p);
    });

    this.setData({
      'form.tags': tags,
      tagInput: ''
    });
  },

  // 删除已选标签
  removeTag(e) {
    const index = e.currentTarget.dataset.index;
    const tags = [...this.data.form.tags];
    tags.splice(index, 1);
    this.setData({ 'form.tags': tags });
  },

  // 点击标签云中的标签：切换选中
  toggleSuggestedTag(e) {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    const tags = [...this.data.form.tags];
    const idx = tags.indexOf(tag);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.setData({ 'form.tags': tags });
  },

  // ===== 封面图 / 图片列表 =====
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

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `guides/covers/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: tempFilePath
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
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    }
  },

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
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    }
  },

  previewImage(e) {
    const { type } = e.currentTarget.dataset;

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

  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.form.images];
    images.splice(index, 1);
    this.setData({ 'form.images': images });
  },

  // 把指定图片往前挪一位（左/上）
  moveImageLeft(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index <= 0) return;
    const images = [...this.data.form.images];
    [images[index - 1], images[index]] = [images[index], images[index - 1]];
    this.setData({ 'form.images': images });
  },

  // 把指定图片往后挪一位（右/下）
  moveImageRight(e) {
    const index = Number(e.currentTarget.dataset.index);
    const images = [...this.data.form.images];
    if (!Number.isInteger(index) || index < 0 || index >= images.length - 1) return;
    [images[index], images[index + 1]] = [images[index + 1], images[index]];
    this.setData({ 'form.images': images });
  },

  deleteCover() {
    this.setData({ 'form.cover': '' });
  },

  // ===== 富文本编辑器 =====

  // editor 初始化完成，拿到上下文
  onEditorReady() {
    const that = this;
    wx.createSelectorQuery()
      .in(this)
      .select('#editor')
      .context(function (res) {
        const ctx = res && res.context;
        if (!ctx) return;
        that.editorCtx = ctx;
        // 编辑模式下，把已有内容塞进去
        if (that._pendingContent) {
          ctx.setContents({ html: that._pendingContent });
          that._pendingContent = '';
        }
      })
      .exec();
  },

  // 同步光标处的格式（用于工具栏按钮高亮）
  onStatusChange(e) {
    this.setData({ formats: e.detail || {} });
  },

  // 同步 HTML 到 form.content
  onContentInput(e) {
    const html = (e.detail && e.detail.html) || '';
    this.setData({ 'form.content': html });
  },

  onEditorFocus() {
    this.setData({ editorFocus: true });
  },
  onEditorBlur() {
    this.setData({ editorFocus: false });
  },

  // 工具栏：通用 format 按钮
  formatTap(e) {
    const { name, value } = e.currentTarget.dataset;
    if (!this.editorCtx) return;
    this.editorCtx.format(name, value);
  },

  // 工具栏：撤销 / 重做
  editorUndo() {
    this.editorCtx && this.editorCtx.undo();
  },
  editorRedo() {
    this.editorCtx && this.editorCtx.redo();
  },

  // 工具栏：清空
  editorClear() {
    if (!this.editorCtx) return;
    wx.showModal({
      title: '提示',
      content: '确定要清空正文吗？',
      success: (res) => {
        if (res.confirm) {
          this.editorCtx.clear();
          this.setData({ 'form.content': '' });
        }
      }
    });
  },

  // 工具栏：插入图片（上传到云存储后插入到光标处）
  async insertImage() {
    if (!this.editorCtx) {
      wx.showToast({ title: '编辑器未就绪', icon: 'none' });
      return;
    }
    try {
      const res = await wx.chooseMedia({
        count: 9,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      wx.showLoading({ title: '上传中...', mask: true });

      // 顺序上传 + 顺序插入，保证图片排列与选择顺序一致
      for (let i = 0; i < res.tempFiles.length; i++) {
        const file = res.tempFiles[i];
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `guides/editor/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: file.tempFilePath
        });

        // 用临时访问 URL 在编辑器里展示，同时把 fileID 写入 data-fileid，
        // 服务端读取详情时会按 data-fileid 重新换发临时链接，避免链接 2 小时过期。
        let displaySrc = uploadRes.fileID;
        try {
          const urlRes = await wx.cloud.getTempFileURL({
            fileList: [uploadRes.fileID]
          });
          if (urlRes && urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
            displaySrc = urlRes.fileList[0].tempFileURL;
          }
        } catch (e) { /* 忽略，回退到 fileID */ }

        await new Promise((resolve) => {
          this.editorCtx.insertImage({
            src: displaySrc,
            data: { fileid: uploadRes.fileID },
            width: '100%',
            success: () => resolve(),
            fail: () => resolve()
          });
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '已插入', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        console.error('插入图片失败', err);
        wx.showToast({ title: '插入失败', icon: 'none' });
      }
    }
  },

  // ===== 保存 =====
  async save() {
    const { form } = this.data;

    // 兜底：从 editor 拉一次最新内容
    if (this.editorCtx) {
      await new Promise((resolve) => {
        this.editorCtx.getContents({
          success: (res) => {
            this.setData({ 'form.content': (res && res.html) || form.content || '' });
            resolve();
          },
          fail: () => resolve()
        });
      });
    }

    const finalForm = this.data.form;

    if (!finalForm.title) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    if (!finalForm.summary) {
      wx.showToast({ title: '请输入摘要', icon: 'none' });
      return;
    }

    if (!finalForm.content || finalForm.content.replace(/<[^>]+>/g, '').trim() === '') {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'huahai',
        data: {
          type: 'adminSaveGuide',
          ...finalForm,
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
