/**
 * selection.js — 餐次/日期/评分选择流
 *
 * 用户拍照后依次触发三条交互消息：
 *   日期选择 → 餐次选择 → 评分选择
 * 每步完成时折叠自身并创建下一步消息。
 * 评分选择完成后联动 image-recognition 的 checkAndShowResult。
 */

const { createMealTypeSelectMessage, createRatingSelectMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES } = require('../../../utils/constants')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** Picker 模式确认 → 委托按钮模式处理（事件格式兼容） */
  onMealTypePickerConfirm(e) {
    this.onMealTypeSelect(e)
  },

  /** 用户选择餐次 → 折叠当前消息 → 插入评分选择 */
  onMealTypeSelect(e) {
    const { value, msgId } = e.detail
    const messages = chatService.updateMessageInList(
      this.data.messages, msgId, () => ({ selectedMealType: value, collapsed: true })
    )
    const mealTypeMsg = messages.find(m => m.id === msgId)
    if (!mealTypeMsg?.data) return

    const { imageUrl, cloudFileId, selectedDate } = mealTypeMsg.data
    const ratingMessage = createRatingSelectMessage(imageUrl, cloudFileId, value, selectedDate)

    this.setData({ messages: [...messages, ratingMessage] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  },

  /** 日期 picker 值变化 → 更新 selectedDate */
  onDateSelect(e) {
    const { msgId, value: date } = e.detail
    const messages = chatService.updateMessageInList(
      this.data.messages, msgId, () => ({ selectedDate: date })
    )
    this.setData({ messages })
    chatService.saveMessages(this.data.messages)
  },

  /** 用户确认日期 → 折叠 → 跳转餐次选择（或评分选择，若已选餐次） */
  onDateConfirm(e) {
    const { msgId } = e.detail
    const messages = chatService.collapseMessage(this.data.messages, msgId)
    const dateMsg = messages.find(m => m.id === msgId)
    if (!dateMsg?.data) return

    const { imageUrl, cloudFileId, selectedDate, selectedMealType } = dateMsg.data
    const nextMessage = selectedMealType
      ? createRatingSelectMessage(imageUrl, cloudFileId, selectedMealType, selectedDate)
      : (() => {
          const m = createMealTypeSelectMessage(imageUrl, cloudFileId)
          m.data.selectedDate = selectedDate
          return m
        })()

    this.setData({ messages: [...messages, nextMessage] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  },

  /** 用户选择评分 → 更新 recognizingTasks → 识别完成则显示结果 */
  onRatingSelect(e) {
    const { value, msgId } = e.detail
    const messages = chatService.updateMessageInList(
      this.data.messages, msgId, () => ({ selectedRating: value, collapsed: true })
    )
    const ratingMsg = messages.find(m => m.id === msgId)
    if (!ratingMsg?.data) return

    const { imageUrl, cloudFileId, selectedMealType, selectedDate } = ratingMsg.data
    const taskKey = cloudFileId
    const task = this.data.recognizingTasks[taskKey]

    if (task) {
      const updatedTasks = {
        ...this.data.recognizingTasks,
        [taskKey]: {
          ...task,
          selectedMealType,
          selectedRating: value,
          selectedDate: selectedDate || this.data.selectedDate
        }
      }
      this.setData({ messages, recognizingTasks: updatedTasks })
      chatService.saveMessages(this.data.messages)

      const updatedTask = updatedTasks[taskKey]
      if (updatedTask.completed && !updatedTask.resultShown) {
        // 识别已完成 → 直接展示结果
        this.checkAndShowResult(taskKey)
      } else if (!updatedTask.completed) {
        // 识别未完成 → 插入等待动画
        const { createRecognizingMessage } = require('../../../utils/message-factory')
        const waitingMessage = createRecognizingMessage()
        this.setData({ messages: [...messages, waitingMessage] })
        chatService.saveMessages(this.data.messages)
        this.scrollToBottom()
      }
    } else {
      this.setData({ messages })
      chatService.saveMessages(this.data.messages)
    }
  }
}
