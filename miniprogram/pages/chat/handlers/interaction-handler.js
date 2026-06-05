/**
 * @fileoverview 消息交互处理模块
 * @description 处理用户与消息组件的交互，包括餐次选择、日期选择、评分选择等功能
 * @module handlers/interaction-handler
 */

const { createMealTypeSelectMessage, createRatingSelectMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES } = require('../../../utils/constants')
const chatService = require('../../../services/chat-service')

module.exports = {
  /**
   * 处理餐次选择事件
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {string} e.detail.value - 选择的餐次类型
   * @param {string} e.detail.msgId - 消息ID
   * @returns {void}
   * @description 用户选择餐次后，更新消息状态并创建评分选择消息
   */
  onMealTypeSelect(e) {
    const { value, msgId } = e.detail
    // 更新消息列表中选中的餐次，并折叠当前消息
    const messages = chatService.updateMessageInList(this.data.messages, msgId, () => ({ selectedMealType: value, collapsed: true }))

    // 查找对应的餐次选择消息
    const mealTypeMsg = messages.find(m => m.id === msgId)
    if (!mealTypeMsg?.data) {
      console.error('onMealTypeSelect: 找不到对应的消息, msgId:', msgId)
      return
    }

    // 创建评分选择消息
    const { imageUrl, cloudFileId, selectedDate } = mealTypeMsg.data
    
    console.log('onMealTypeSelect: imageUrl:', imageUrl, 'cloudFileId:', cloudFileId, 'selectedDate:', selectedDate, 'mealType:', value)
    
    const ratingMessage = createRatingSelectMessage(imageUrl, cloudFileId, value, selectedDate)

    // 更新消息列表并滚动到底部
    this.setData({ messages: [...messages, ratingMessage] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  },

  /**
   * 处理日期选择事件
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {string} e.detail.msgId - 消息ID
   * @param {string} e.detail.value - 选择的日期
   * @returns {void}
   * @description 用户选择日期后，更新消息状态
   */
  onDateSelect(e) {
    const { msgId, value: date } = e.detail
    // 更新消息列表中选中的日期
    const messages = chatService.updateMessageInList(this.data.messages, msgId, () => ({ selectedDate: date }))
    this.setData({ messages })
    chatService.saveMessages(this.data.messages)
  },

  /**
   * 处理日期确认事件
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {string} e.detail.msgId - 消息ID
   * @returns {void}
   * @description 用户确认日期选择后，根据是否已选择餐次决定下一步消息类型
   */
  onDateConfirm(e) {
    const { msgId } = e.detail
    // 折叠日期选择消息
    const messages = chatService.collapseMessage(this.data.messages, msgId)
    const dateMsg = messages.find(m => m.id === msgId)

    if (!dateMsg?.data) {
      console.error('onDateConfirm: 找不到对应的消息, msgId:', msgId)
      return
    }

    const { imageUrl, cloudFileId, selectedDate, selectedMealType } = dateMsg.data
    
    console.log('onDateConfirm: imageUrl:', imageUrl, 'cloudFileId:', cloudFileId, 'selectedDate:', selectedDate, 'selectedMealType:', selectedMealType)

    // 根据是否已选择餐次决定创建评分消息或餐次选择消息
    let nextMessage
    if (selectedMealType) {
      nextMessage = createRatingSelectMessage(imageUrl, cloudFileId, selectedMealType, selectedDate)
    } else {
      nextMessage = createMealTypeSelectMessage(imageUrl, cloudFileId)
      nextMessage.data.selectedDate = selectedDate
    }

    // 更新消息列表并滚动到底部
    this.setData({ messages: [...messages, nextMessage] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  },

  /**
   * 处理评分选择事件
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {number} e.detail.value - 评分值
   * @param {string} e.detail.msgId - 消息ID
   * @returns {void}
   * @description 用户选择评分后，更新识别任务状态，若识别已完成则显示结果
   */
  onRatingSelect(e) {
    const { value, msgId } = e.detail
    // 更新消息列表中选中的评分，并折叠当前消息
    const messages = chatService.updateMessageInList(this.data.messages, msgId, () => ({ selectedRating: value, collapsed: true }))
    const ratingMsg = messages.find(m => m.id === msgId)

    if (!ratingMsg?.data) {
      console.error('onRatingSelect: 找不到对应的消息, msgId:', msgId)
      this.setData({ messages })
      return
    }

    // 获取图片URL和识别任务 - 使用 cloudFileId 作为任务键
    const { imageUrl, cloudFileId, selectedMealType, selectedDate } = ratingMsg.data
    const taskKey = cloudFileId
    const task = this.data.recognizingTasks[taskKey]

    console.log('onRatingSelect: cloudFileId:', cloudFileId, 'taskKey:', taskKey)
    console.log('onRatingSelect: 当前 recognizingTasks keys:', Object.keys(this.data.recognizingTasks))

    if (task) {
      // 更新识别任务的用户选择信息
      const updatedTasks = {
        ...this.data.recognizingTasks,
        [taskKey]: {
          ...task,
          selectedMealType: selectedMealType,
          selectedRating: value,
          selectedDate: selectedDate || this.data.selectedDate
        }
      }
      
      this.setData({
        messages,
        recognizingTasks: updatedTasks
      })
      chatService.saveMessages(this.data.messages)

      // 获取更新后的 task（确保使用最新数据）
      const updatedTask = updatedTasks[taskKey]
      
      console.log('onRatingSelect: 更新后的 task:', {
        completed: updatedTask.completed,
        selectedMealType: updatedTask.selectedMealType,
        selectedRating: updatedTask.selectedRating,
        selectedDate: updatedTask.selectedDate,
        resultShown: updatedTask.resultShown
      })

      // 根据识别任务状态决定后续操作
      if (updatedTask && updatedTask.completed && !updatedTask.resultShown) {
        // 识别已完成，显示结果
        console.log('onRatingSelect: 识别已完成，调用 checkAndShowResult')
        this.checkAndShowResult(taskKey)
      } else if (!updatedTask || !updatedTask.completed) {
        // 识别未完成，显示等待消息
        const { createTextMessage } = require('../../../utils/message-factory')
        const { MESSAGE_ROLES } = require('../../../utils/constants')
        const waitingMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, '⏳ AI 正在识别中，请稍候...')
        this.setData({ messages: [...messages, waitingMessage] })
        chatService.saveMessages(this.data.messages)
        this.scrollToBottom()
      } else {
        console.log('onRatingSelect: 不显示结果，原因:', {
          completed: updatedTask.completed,
          resultShown: updatedTask.resultShown
        })
      }
    } else {
      console.error('onRatingSelect: 找不到对应的识别任务, taskKey:', taskKey)
      console.log('onRatingSelect: 当前 recognizingTasks:', this.data.recognizingTasks)
      this.setData({ messages })
      chatService.saveMessages(this.data.messages)
    }
  }
}
