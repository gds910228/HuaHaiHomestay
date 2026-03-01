// components/optimized-image/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图片地址
    src: {
      type: String,
      value: ''
    },
    // 宽度
    width: {
      type: String,
      value: '100%'
    },
    // 高度
    height: {
      type: String,
      value: '320rpx'
    },
    // 图片模式
    imageMode: {
      type: String,
      value: 'aspectFill' // scaleToFill, aspectFit, aspectFill, widthFix, etc.
    },
    // 组件模式（用于样式）
    mode: {
      type: String,
      value: 'aspectFill'
    },
    // 是否懒加载
    lazyLoad: {
      type: Boolean,
      value: true
    },
    // 是否长按显示菜单
    showMenuByLongpress: {
      type: Boolean,
      value: true
    },
    // 徽章文字
    badge: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    loaded: false,
    errored: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 图片加载成功
     */
    handleLoad(e) {
      this.setData({
        loaded: true,
        errored: false
      });
      this.triggerEvent('load', e.detail);
    },

    /**
     * 图片加载失败
     */
    handleError(e) {
      this.setData({
        loaded: false,
        errored: true
      });
      this.triggerEvent('error', e.detail);
    }
  }
})
