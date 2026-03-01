// components/empty-state/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图标emoji
    icon: {
      type: String,
      value: ''
    },
    // 图片地址
    image: {
      type: String,
      value: ''
    },
    // 标题
    title: {
      type: String,
      value: '暂无数据'
    },
    // 描述
    description: {
      type: String,
      value: ''
    },
    // 操作按钮文字
    actionText: {
      type: String,
      value: ''
    },
    // 类型: default, simple
    type: {
      type: String,
      value: 'default'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理操作点击
     */
    handleAction(e) {
      this.triggerEvent('action', e.detail);
    }
  }
})
