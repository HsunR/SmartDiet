/**
 * save-record.js — 食物记录保存与每日进度
 *
 * 职责：
 * - onFoodCardConfirm   用户确认食物卡片 → 保存到 FastAPI → 插入成功提示
 * - updateDailyProgress 拉取当日记录，更新 dailyScore 数据
 */

const { createTextMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES, MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, getCurrentMealType, getMealTypeLabel } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** 用户点击「确认」→ 保存饮食记录到服务器 → 显示成功消息 → 刷新进度 */
  async onFoodCardConfirm(e) {
    const { foods, mealOverview, dietaryAdvice } = e.detail
    const { index: foodCardIndex, message: foodCardMsg } = chatService.findLastMessageByType(
      this.data.messages, MESSAGE_TYPES.FOOD_CARD
    )
    if (foodCardIndex === -1) return

    const mealType = foodCardMsg?.data?.mealType || getCurrentMealType()
    const rating = foodCardMsg?.data?.rating || 0
    const imageUrl = foodCardMsg?.data?.cloudFileId || foodCardMsg?.data?.imageUrl || this.data.currentCloudFileId
    const selectedDate = foodCardMsg?.data?.selectedDate || formatDate(new Date())

    this.setData({
      ['messages[' + foodCardIndex + '].data.actionCompleted']: true,
      isLoading: true
    })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()

    try {
      const saveResult = await safeApiCall(() =>
        api.food.addRecord({ date: selectedDate, mealType, rating, foods, imageUrl, mealOverview })
      )
      getApp().globalData.needRefreshReport = true

      const recordId = saveResult?.data?.recordId || ''
      this.setData({
        ['messages[' + foodCardIndex + '].data.recordSaved']: true,
        ['messages[' + foodCardIndex + '].data.recordId']: recordId
      })

      const successMessage = createTextMessage(
        MESSAGE_ROLES.ASSISTANT,
        `✅ 已记录为${getMealTypeLabel(mealType)}！\n\n健康评分：${mealOverview.overallHealthScore || 60}分\n您的评分：${rating === 0 ? '待定' : rating + '星'}`
      )
      this.setData({ messages: [...this.data.messages, successMessage] })
      chatService.saveMessages(this.data.messages)
      this.updateDailyProgress()
      this.scrollToBottom()
    } catch (error) {
      console.error('Save record error:', error)
      this.showErrorMessage('保存记录失败，请重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /** 拉取当日记录 → 计算平均健康评分 → 更新 dailyScore */
  async updateDailyProgress() {
    const app = getApp()
    if (!app.globalData.hasLogin) return
    try {
      const today = formatDate(new Date())
      const result = await safeApiCall(() => api.food.getRecords(today))
      if (result.success && result.data) {
        const avgScore = result.data.length > 0
          ? Math.round(result.data.reduce((sum, r) => sum + ((r.mealOverview?.overallHealthScore) || 60), 0) / result.data.length)
          : 0
        this.setData({ dailyScore: avgScore })
      }
    } catch (error) {
      console.error('Update progress error:', error)
    }
  }
}
