/**
 * send-message.js — 消息发送与 AI 流式回复
 *
 * 职责：
 * - sendMessage      将用户文本发往 SSE 流式接口，实时更新气泡内容
 * - getRecommendation 拉取当日饮食记录生成摘要推荐
 * - showErrorMessage  在对话中插入错误提示气泡
 */

const { createTextMessage } = require('../../../utils/message-factory')
const { MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, generateId } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** 发送文本消息 → SSE 流式获取 AI 回复 → 实时更新气泡 */
  async sendMessage() {
    const { inputValue, isLoading } = this.data
    if (!inputValue.trim() || isLoading) return

    // 插入用户消息 + 空 AI 占位（同时渲染，避免出现两条消息）
    const userMessage = createTextMessage(MESSAGE_ROLES.USER, inputValue.trim())
    const aiMessageId = generateId()
    const aiMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, '')
    aiMessage.id = aiMessageId
    aiMessage.isStreaming = true
    this.setData({
      messages: [...this.data.messages, userMessage, aiMessage],
      inputValue: '',
      isLoading: true,
      isAtBottom: true
    })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()

    let fullContent = ''

    try {
      api.chat.sendStream(
        inputValue.trim(),
        null, // conversationId, 暂不启用多轮会话管理
        // onChunk — 每次收到数据块时更新气泡
        (content) => {
          fullContent += content
          this._scrollTopValue++
          const aiIndex = this.data.messages.length - 1
          this.setData({
            [`messages[${aiIndex}].content`]: fullContent,
            scrollIntoView: '',
            scrollTop: this._scrollTopValue
          })
        },
        // onDone — 流式结束，关闭 loading 态
        () => {
          const aiIndex = this.data.messages.length - 1
          const messages = this.data.messages.map((msg, i) =>
            i === aiIndex ? { ...msg, content: fullContent, isStreaming: false } : msg
          )
          this.setData({ messages, isLoading: false }, () => this.scrollToBottom())
          chatService.saveMessages(this.data.messages)
        },
        // onError — 流式异常，展示错误消息
        (error) => {
          const aiIndex = this.data.messages.length - 1
          const messages = this.data.messages.map((msg, i) =>
            i === aiIndex ? { ...msg, content: `❌ ${error}`, isStreaming: false } : msg
          )
          this.setData({ messages, isLoading: false }, () => this.scrollToBottom())
          chatService.saveMessages(this.data.messages)
        }
      )
    } catch (error) {
      this.showErrorMessage(error.message || '网络错误，请稍后重试')
      this.setData({ isLoading: false })
    }
  },

  /** 获取今日饮食记录 → 生成摘要推荐消息 */
  async getRecommendation() {
    this.setData({ isLoading: true })
    try {
      const today = formatDate(new Date())
      const result = await safeApiCall(() => api.food.getRecords(today))
      if (result.success && result.data) {
        const records = result.data
        const avgScore = records.length > 0
          ? Math.round(records.reduce((sum, r) => sum + ((r.mealOverview?.overallHealthScore) || 60), 0) / records.length)
          : 0
        const foods = []
        records.forEach(r => (r.foods || []).forEach(f => foods.push(f.name)))

        const message = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `📊 今日饮食摘要\n\n平均健康评分：${avgScore} 分\n用餐次数：${records.length} 次\n食物种类：${[...new Set(foods)].join('、')}\n\n建议保持均衡饮食，多吃蔬菜水果！`
        )
        this.setData({ messages: [...this.data.messages, message] })
        this.scrollToBottom()
        chatService.saveMessages(this.data.messages)
      }
    } catch (error) {
      this.showErrorMessage('获取建议失败，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /** 插入错误提示气泡 */
  showErrorMessage(message) {
    const errorMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, `❌ ${message}`)
    this.setData({ messages: [...this.data.messages, errorMessage] })
    this.scrollToBottom()
    chatService.saveMessages(this.data.messages)
  }
}
