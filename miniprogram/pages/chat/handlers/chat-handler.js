/**
 * @fileoverview 聊天消息处理模块
 * @description 处理聊天消息的发送、AI回复获取、错误提示及消息滚动等功能
 * @module handlers/chat-handler
 */

const { createTextMessage } = require('../../../utils/message-factory')
const { MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, generateId } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {
  /**
   * 发送用户消息并获取AI回复（流式）
   * @async
   * @param {void}
   * @returns {Promise<void>}
   * @description 验证输入内容，创建用户消息，调用AI流式接口获取回复，并实时更新消息列表
   */
  async sendMessage() {
    const { inputValue, isLoading } = this.data
    if (!inputValue.trim() || isLoading) return

    const userMessage = createTextMessage(MESSAGE_ROLES.USER, inputValue.trim())
    this.setData({ messages: [...this.data.messages, userMessage], inputValue: '', isLoading: true })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()

    // 创建一个空的AI消息，用于流式更新
    const aiMessageId = generateId()
    const aiMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, '')
    aiMessage.id = aiMessageId
    aiMessage.isStreaming = true
    this.setData({ messages: [...this.data.messages, aiMessage] })
    this.scrollToBottom()

    let fullContent = ''

    try {
      // 使用流式API
      api.chat.sendStream(
        inputValue.trim(),
        null, // conversationId
        // onChunk - 收到数据块时更新消息
        (content) => {
          fullContent += content
          const messages = this.data.messages.map(msg => {
            if (msg.id === aiMessageId) {
              return { ...msg, content: fullContent }
            }
            return msg
          })
          this.setData({ messages })
          this.scrollToBottom()
        },
        // onDone - 流式结束
        () => {
          const messages = this.data.messages.map(msg => {
            if (msg.id === aiMessageId) {
              return { ...msg, content: fullContent, isStreaming: false }
            }
            return msg
          })
          this.setData({ messages, isLoading: false })
          chatService.saveMessages(this.data.messages)
          this.scrollToBottom()
        },
        // onError - 错误处理
        (error) => {
          const messages = this.data.messages.map(msg => {
            if (msg.id === aiMessageId) {
              return { ...msg, content: `❌ ${error}`, isStreaming: false }
            }
            return msg
          })
          this.setData({ messages, isLoading: false })
          chatService.saveMessages(this.data.messages)
          this.scrollToBottom()
        }
      )
    } catch (error) {
      this.showErrorMessage(error.message || '网络错误，请稍后重试')
      this.setData({ isLoading: false })
    }
  },

  /**
   * 获取今日饮食推荐摘要
   * @async
   * @param {void}
   * @returns {Promise<void>}
   * @description 获取今日饮食记录，计算总热量和食物种类，生成推荐消息
   */
  async getRecommendation() {
    this.setData({ isLoading: true })

    try {
      const today = formatDate(new Date())
      const result = await safeApiCall(() => api.food.getRecords(today))

      // 处理饮食记录数据，生成摘要消息
      if (result.success && result.data) {
        const records = result.data
        // 计算平均健康评分
        const avgScore = records.length > 0
          ? Math.round(records.reduce((sum, r) => sum + ((r.mealOverview?.overallHealthScore) || 60), 0) / records.length)
          : 0
        // 收集所有食物名称
        const foods = []
        records.forEach(r => (r.foods || []).forEach(f => foods.push(f.name)))

        // 创建AI推荐消息
        const message = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `📊 今日饮食摘要\n\n平均健康评分：${avgScore} 分\n用餐次数：${records.length} 次\n食物种类：${[...new Set(foods)].join('、')}\n\n建议保持均衡饮食，多吃蔬菜水果！`
        )
        this.setData({ messages: [...this.data.messages, message] })
        chatService.saveMessages(this.data.messages)
      }
    } catch (error) {
      this.showErrorMessage('获取建议失败，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  /**
   * 显示错误消息
   * @param {string} message - 错误信息内容
   * @returns {void}
   * @description 创建带错误标识的AI消息并添加到消息列表
   */
  showErrorMessage(message) {
    const errorMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, `❌ ${message}`)
    this.setData({ messages: [...this.data.messages, errorMessage] })
    chatService.saveMessages(this.data.messages)
  },

  /**
   * 滚动到消息列表底部
   * @param {void}
   * @returns {void}
   * @description 获取最后一条消息的ID，设置scrollToView实现自动滚动
   * 多次尝试滚动，确保异步加载内容（如图片）也能正确滚动
   */
  scrollToBottom() {
    const messages = this.data.messages
    if (messages.length === 0) return

    const lastMsgId = `msg-${messages[messages.length - 1].id}`
    
    // 立即尝试滚动
    this.setData({ scrollToView: lastMsgId })
    
    // 延迟再次滚动，确保子组件渲染完成
    setTimeout(() => {
      this.setData({ scrollToView: lastMsgId })
    }, 150)
    
    // 再次延迟滚动，处理图片等异步加载内容
    setTimeout(() => {
      this.setData({ scrollToView: lastMsgId })
    }, 500)
  }
}
