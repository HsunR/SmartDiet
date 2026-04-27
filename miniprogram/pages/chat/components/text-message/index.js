/**
 * @fileoverview 文本消息组件
 * 用于显示聊天界面中的文本消息内容，支持用户和 AI 助手两种角色
 * @component TextMessage
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性（外部传入的数据）
   */
  properties: {
    /**
     * 消息文本内容
     * @type {string}
     */
    content: {
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
    },
    /**
     * 消息时间戳
     * @type {number}
     */
    timestamp: {
      type: Number,
      value: 0
    }
  }
})
