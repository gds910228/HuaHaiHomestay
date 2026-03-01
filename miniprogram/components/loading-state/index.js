// components/loading-state/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 加载类型: spinner, text
    type: {
      type: String,
      value: 'spinner'
    },
    // 加载文字
    text: {
      type: String,
      value: '加载中...'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {}
})
