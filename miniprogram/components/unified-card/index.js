// components/unified-card/index.js
Component({
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    extra: { type: String, value: '' },
    footer: { type: String, value: '' },
    // 类型: default, media, list
    type: { type: String, value: 'default' },
    // 阴影: none, sm, md, lg
    shadow: { type: String, value: 'md' },
    // 内边距: none, small, normal, large
    padding: { type: String, value: 'normal' },
    // Bento span: '' | '1' | '2' | '3' (1=半宽, 2=全宽, 3=三分之一)
    span: { type: String, value: '' },
    clickable: { type: Boolean, value: false }
  },

  data: {
    shadowClass: '',
    paddingClass: '',
    spanClass: ''
  },

  lifetimes: {
    attached() {
      this.initClasses();
    }
  },

  observers: {
    'shadow, padding, span'() {
      this.initClasses();
    }
  },

  methods: {
    initClasses() {
      const { shadow, padding, span } = this.properties;
      this.setData({
        shadowClass: `shadow-${shadow}`,
        paddingClass: padding === 'none' ? 'padding-none' :
                      padding === 'small' ? 'padding-small' :
                      padding === 'large' ? 'padding-large' : '',
        spanClass: span ? `span-${span}` : ''
      });
    },

    handleTap(e) {
      if (this.properties.clickable) {
        this.triggerEvent('click', e.detail);
      }
    }
  }
})
