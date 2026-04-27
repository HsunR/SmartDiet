/**
 * @fileoverview 图片消息组件
 * 用于显示聊天界面中的图片消息，支持点击查看大图预览
 * @component ImageMessage
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性（外部传入的数据）
   */
  properties: {
    /**
     * 图片 URL 地址
     * @type {string}
     */
    imageUrl: {
      type: String,
      value: ''
    },
    /**
     * 消息发送者角色
     * @type {string}
     * @default 'assistant'
     */
    role: {
      type: String,
      value: 'assistant'
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 图片预览事件处理
     * 点击图片时触发预览
     * @param {Object} e - 事件对象
     * @fires ImageMessage#previewImage
     */
    handlePreview() {
      this.triggerEvent('previewImage', {
        imageUrl: this.data.imageUrl
      });
    }
  }
})
