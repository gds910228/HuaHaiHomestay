// components/unified-card/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 卡片标题
    title: {
      type: String,
      value: ''
    },
    // 卡片副标题
    subtitle: {
      type: String,
      value: ''
    },
    // 额外信息
    extra: {
      type: String,
      value: ''
    },
    // 底部信息
    footer: {
      type: String,
      value: ''
    },
    // 卡片类型: default, media, list
    type: {
      type: String,
      value: 'default'
    },
    // 阴影级别: none, sm, md, lg
    shadow: {
      type: String,
      value: 'md'
    },
    // 内边距: none, small, normal, large
    padding: {
      type: String,
      value: 'normal'
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    shadowClass: '',
    paddingClass: ''
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initClasses();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化样式类
     */
    initClasses() {
      const { shadow, padding } = this.properties;
      this.setData({
        shadowClass: `shadow-${shadow}`,
        paddingClass: padding === 'none' ? 'padding-none' :
                      padding === 'small' ? 'padding-small' :
                      padding === 'large' ? 'padding-large' : ''
      });
    },

    /**
     * 处理点击事件
     */
    handleTap(e) {
      if (this.properties.clickable) {
        this.triggerEvent('click', e.detail);
      }
    }
  }
})
