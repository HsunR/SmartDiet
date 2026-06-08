/**
 * feedback.js — 食物卡片编辑与反馈重新识别
 *
 * 流程：
 *   onFoodCardEdit       用户点击「编辑」→ 标记原卡片 → 插入反馈输入框
 *   → 用户填写反馈 → onFeedbackSubmit → 调用 recognizeWithFeedback
 *   → 获取新结果 → 创建新食物卡片替换旧卡片
 */

const { createTextMessage, createFoodCardMessage, createFeedbackInputMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES, MESSAGE_ROLES } = require('../../../utils/constants')
const { generateId } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** 用户点击食物卡片的「编辑」→ 标记原卡片已操作 → 插入反馈输入框 */
  onFoodCardEdit(e) {
    const { foods, mealOverview } = e.detail
    const { index: foodCardIndex, message: foodCardMsg } = chatService.findLastMessageByType(
      this.data.messages, MESSAGE_TYPES.FOOD_CARD
    )
    if (foodCardIndex === -1) return

    const imageUrl = foodCardMsg?.data?.imageUrl || this.data.currentImageUrl
    const feedbackMessage = createFeedbackInputMessage(foods, mealOverview, imageUrl)

    this.setData({
      ['messages[' + foodCardIndex + '].data.actionCompleted']: true,
      messages: [...this.data.messages, feedbackMessage],
      currentImageUrl: imageUrl,
      editingFoodCardIndex: foodCardIndex,
      editingRating: foodCardMsg?.data?.rating || 0,
      editingMealType: foodCardMsg?.data?.mealType || '',
      editingSelectedDate: foodCardMsg?.data?.selectedDate || ''
    })
    chatService.saveMessages(this.data.messages)
  },

  /** 用户提交反馈 → 调用 recognizeWithFeedback → 替换为新食物卡片 */
  async onFeedbackSubmit(e) {
    const { feedback } = e.detail
    const feedbackMsg = this.data.messages.find(m => m.type === MESSAGE_TYPES.FEEDBACK_INPUT)
    const { foods, mealOverview, imageUrl } = feedbackMsg?.data || {}
    const { editingRating, editingMealType, editingSelectedDate } = this.data

    if (!imageUrl) {
      this.showErrorMessage('请重新上传图片')
      return
    }

    // 标记反馈消息为已完成
    this.setData({
      ['messages.' + this.data.messages.findIndex(m => m.type === MESSAGE_TYPES.FEEDBACK_INPUT) + '.data.completed']: true,
      isLoading: true
    })

    // 插入用户反馈文本到对话
    const feedbackText = createTextMessage(MESSAGE_ROLES.USER, `反馈：${feedback}`)
    this.setData({ messages: [...this.data.messages, feedbackText] })
    chatService.saveMessages(this.data.messages)

    try {
      const recognizeResult = await safeApiCall(() => api.food.recognizeWithFeedback(imageUrl, feedback))
      if (recognizeResult.success && recognizeResult.data?.foods) {
        const newFoods = recognizeResult.data.foods.map(food => ({ ...food, imageUrl: foods[0]?.imageUrl || '' }))
        const newMealOverview = recognizeResult.data.mealOverview || mealOverview
        const newDietaryAdvice = recognizeResult.data.dietaryAdvice || ''

        const foodCardMessage = createFoodCardMessage(newFoods, newMealOverview, newDietaryAdvice, generateId())
        Object.assign(foodCardMessage.data, {
          imageUrl,
          rating: editingRating || 0,
          mealType: editingMealType || '',
          selectedDate: editingSelectedDate || ''
        })

        this.setData({
          messages: [...this.data.messages, foodCardMessage],
          currentFoods: newFoods,
          currentMealOverview: newMealOverview,
          currentImageUrl: imageUrl,
          editingFoodCardIndex: -1,
          editingRating: 0,
          editingMealType: '',
          editingSelectedDate: ''
        })
        chatService.saveMessages(this.data.messages)
      } else {
        this.showErrorMessage('重新识别失败，请重试')
      }
    } catch (error) {
      console.error('Re-recognize error:', error)
      this.showErrorMessage('重新识别失败')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /** 反馈输入框实时输入 */
  onFeedbackInput(e) {
    const { msgId } = e.currentTarget.dataset
    this.setData({ ['feedbackValues.' + msgId]: e.detail.value })
  },

  /** 点击反馈提交按钮 → 校验非空 → 委托 onFeedbackSubmit */
  onFeedbackSubmitBtn(e) {
    const { msgId } = e.currentTarget.dataset
    const feedback = this.data.feedbackValues[msgId]
    if (!feedback?.trim()) {
      wx.showToast({ title: '请输入反馈意见', icon: 'none' })
      return
    }
    this.onFeedbackSubmit({ detail: { feedback } })
  }
}
