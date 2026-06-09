/**
 * save-record.js — 食物记录保存与每日进度
 *
 * 职责：
 * - onFoodCardConfirm   用户确认食物卡片 → 保存到 FastAPI → 卡片展示保存成功动画
 * - updateDailyProgress 拉取当日记录，更新 dailyScore 数据
 */

const { MESSAGE_TYPES } = require('../../../utils/constants')
const { formatDate, getCurrentMealType } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** 用户点击「确认」→ 保存饮食记录到服务器 → 卡片展示保存成功动画 → 刷新进度 */
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
      ['messages[' + foodCardIndex + '].data.saving']: true,
      isLoading: true
    })
    chatService.saveMessages(this.data.messages)

    try {
      const saveResult = await safeApiCall(() =>
        api.food.addRecord({ date: selectedDate, mealType, rating, foods, imageUrl, mealOverview })
      )
      getApp().globalData.needRefreshReport = true

      const recordId = saveResult?.data?.recordId || ''
      this.setData({
        ['messages[' + foodCardIndex + '].data.saving']: false,
        ['messages[' + foodCardIndex + '].data.recordSaved']: true,
        ['messages[' + foodCardIndex + '].data.recordId']: recordId
      })
      chatService.saveMessages(this.data.messages)
      this.updateDailyProgress()
    } catch (error) {
      console.error('Save record error:', error)
      this.setData({
        ['messages[' + foodCardIndex + '].data.saving']: false
      })
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
