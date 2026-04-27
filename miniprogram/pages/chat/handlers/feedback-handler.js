/**
 * @fileoverview 反馈处理模块
 * @description 处理食物卡片的编辑反馈、提交反馈重新识别等功能
 * @module handlers/feedback-handler
 */

const { createTextMessage, createFoodCardMessage, createFeedbackInputMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES, MESSAGE_ROLES } = require('../../../utils/constants')
const { generateId } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {
  /**
   * 处理食物卡片编辑事件
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {Array} e.detail.foods - 食物列表
   * @param {Object} e.detail.mealOverview - 餐食概览信息
   * @returns {void}
   * @description 用户点击编辑按钮后，创建反馈输入消息并保存编辑状态
   */
  onFoodCardEdit(e) {
    const { foods, mealOverview } = e.detail
    // 查找最后一条食物卡片消息
    const { index: foodCardIndex, message: foodCardMsg } = chatService.findLastMessageByType(this.data.messages, MESSAGE_TYPES.FOOD_CARD)

    if (foodCardIndex === -1) return

    // 获取图片URL
    const imageUrl = foodCardMsg?.data?.imageUrl || this.data.currentImageUrl

    // 创建反馈输入消息
    const feedbackMessage = createFeedbackInputMessage(foods, mealOverview, imageUrl)
    // 更新页面数据，标记原卡片为已操作，保存编辑状态
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
    this.scrollToBottom()
  },

  /**
   * 处理反馈提交事件
   * @async
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {string} e.detail.feedback - 用户反馈文本
   * @returns {Promise<void>}
   * @description 提交用户反馈，调用AI重新识别图片，显示新的识别结果
   */
  async onFeedbackSubmit(e) {
    const { feedback } = e.detail
    // 获取反馈输入消息
    const feedbackMsg = this.data.messages.find(m => m.type === MESSAGE_TYPES.FEEDBACK_INPUT)
    const { foods, mealOverview, imageUrl } = feedbackMsg?.data || {}
    const { editingRating, editingMealType, editingSelectedDate } = this.data

    // 验证图片URL是否存在
    if (!imageUrl) {
      this.showErrorMessage('请重新上传图片')
      return
    }

    // 标记反馈消息为已完成，显示加载状态
    this.setData({
      ['messages.' + this.data.messages.findIndex(m => m.type === MESSAGE_TYPES.FEEDBACK_INPUT) + '.data.completed']: true,
      isLoading: true
    })

    // 创建用户反馈文本消息
    const feedbackText = createTextMessage(MESSAGE_ROLES.USER, `反馈：${feedback}`)
    this.setData({ messages: [...this.data.messages, feedbackText] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()

    try {
      // 调用带反馈的重新识别接口
      const recognizeResult = await safeApiCall(() => api.food.recognizeWithFeedback(imageUrl, feedback))

      // 处理重新识别结果
      if (recognizeResult.success && recognizeResult.data?.foods) {
        // 处理食物数据，保留原图片URL
        const newFoods = recognizeResult.data.foods.map(food => ({ ...food, imageUrl: foods[0]?.imageUrl || '' }))
        const newMealOverview = recognizeResult.data.mealOverview || mealOverview
        const newDietaryAdvice = recognizeResult.data.dietaryAdvice || ''

        // 创建新的食物卡片消息
        const foodCardMessage = createFoodCardMessage(newFoods, newMealOverview, newDietaryAdvice, generateId())
        // 绑定原卡片的元数据
        Object.assign(foodCardMessage.data, {
          imageUrl,
          rating: editingRating || 0,
          mealType: editingMealType || '',
          selectedDate: editingSelectedDate || ''
        })

        // 更新页面数据，清除编辑状态
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
      this.scrollToBottom()
    }
  },

  /**
   * 处理反馈输入事件
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget - 当前目标元素
   * @param {Object} e.currentTarget.dataset - 元素数据集
   * @param {string} e.currentTarget.dataset.msgId - 消息ID
   * @param {Object} e.detail - 事件详情
   * @param {string} e.detail.value - 输入的反馈内容
   * @returns {void}
   * @description 实时保存用户输入的反馈内容到页面数据中
   */
  onFeedbackInput(e) {
    const { msgId } = e.currentTarget.dataset
    this.setData({ ['feedbackValues.' + msgId]: e.detail.value })
  },

  /**
   * 处理反馈提交按钮点击事件
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget - 当前目标元素
   * @param {Object} e.currentTarget.dataset - 元素数据集
   * @param {string} e.currentTarget.dataset.msgId - 消息ID
   * @returns {void}
   * @description 验证反馈内容非空后，调用onFeedbackSubmit提交反馈
   */
  onFeedbackSubmitBtn(e) {
    const { msgId } = e.currentTarget.dataset
    const feedback = this.data.feedbackValues[msgId]

    // 验证反馈内容不能为空
    if (!feedback?.trim()) {
      wx.showToast({ title: '请输入反馈意见', icon: 'none' })
      return
    }

    this.onFeedbackSubmit({ detail: { feedback } })
  }
}
