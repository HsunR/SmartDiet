/**
 * @fileoverview 饮食记录处理模块
 * @description 处理饮食记录的保存、确认、每日进度更新等功能
 * @module handlers/record-handler
 * @author SmartDiet Team
 * @created 2026-04-26
 */

const { createTextMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES, MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, getCurrentMealType, getMealTypeLabel } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {
  /**
   * 处理食物卡片确认保存事件
   * @async
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {Array} e.detail.foods - 食物列表
   * @param {Object} e.detail.mealOverview - 餐食概览信息
   * @param {string} e.detail.dietaryAdvice - 饮食建议
   * @returns {Promise<void>}
   * @description 用户确认保存饮食记录，将数据提交到服务器并更新UI状态
   */
  async onFoodCardConfirm(e) {
    const { foods, mealOverview, dietaryAdvice } = e.detail
    const { index: foodCardIndex, message: foodCardMsg } = chatService.findLastMessageByType(this.data.messages, MESSAGE_TYPES.FOOD_CARD)

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

    const record = {
      date: selectedDate, mealType, rating, foods,
      imageUrl, mealOverview
    }

    try {
      const saveResult = await safeApiCall(() => api.food.addRecord(record))

      const app = getApp()
      app.globalData.needRefreshReport = true

      // 确保 recordId 是字符串类型，如果没有则使用空字符串
      const recordId = saveResult?.data?.recordId || ''
      
      this.setData({
        ['messages[' + foodCardIndex + '].data.recordSaved']: true,
        ['messages[' + foodCardIndex + '].data.recordId']: recordId
      })

      const successMessage = createTextMessage(
        MESSAGE_ROLES.ASSISTANT,
        `✅ 已记录为${getMealTypeLabel(mealType)}！\n\n健康评分：${mealOverview.overallHealthScore || 60}分\n您的评分：${rating === 0 ? '待定' : rating + '星'}`
      )

      this.setData({
        messages: [...this.data.messages, successMessage]
      })
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

  /**
   * 更新每日饮食进度
   * @async
   * @returns {Promise<void>}
   * @description 获取今日所有饮食记录，计算总热量并更新页面显示
   */
  async updateDailyProgress() {
    try {
      const today = formatDate(new Date())
      const result = await safeApiCall(() => api.food.getRecords(today))
      if (result.success && result.data) {
        // 计算今日平均健康评分
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
