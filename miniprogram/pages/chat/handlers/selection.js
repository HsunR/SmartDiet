/**
 * selection.js — 餐次/日期/评分选择流
 *
 * 用户拍照后依次触发三条交互消息：
 *   日期选择 → 餐次选择 → 评分选择
 * 每步完成时折叠自身并创建下一步消息。
 * 流式识别时，选择值会同步更新到已存在的食物卡片。
 */

const { createMealTypeSelectMessage, createRatingSelectMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES } = require('../../../utils/constants')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** Picker 模式确认 → 委托按钮模式处理（事件格式兼容） */
  onMealTypePickerConfirm(e) {
    this.onMealTypeSelect(e)
  },

  /** 用户选择餐次 → 折叠当前消息 → 插入评分选择 → 同步到食物卡片 */
  onMealTypeSelect(e) {
    const { value, msgId } = e.detail
    const messages = chatService.updateMessageInList(
      this.data.messages, msgId, () => ({ selectedMealType: value, collapsed: true })
    )
    const mealTypeMsg = messages.find(m => m.id === msgId)
    if (!mealTypeMsg?.data) return

    const { imageUrl, cloudFileId, selectedDate } = mealTypeMsg.data
    const task = this.data.recognizingTasks[cloudFileId]

    // 同步餐次到已存在的食物卡片
    let updatedMessages = messages
    if (task && task.cardMsgId) {
      updatedMessages = updatedMessages.map(msg => {
        if (msg.id === task.cardMsgId) {
          return { ...msg, data: { ...msg.data, mealType: value } }
        }
        return msg
      })
    }

    const ratingMessage = createRatingSelectMessage(imageUrl, cloudFileId, value, selectedDate)

    this.setData({ messages: [...updatedMessages, ratingMessage] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  },

  /** 日期 picker 值变化 → 更新 selectedDate → 同步到食物卡片 */
  onDateSelect(e) {
    const { msgId, value: date } = e.detail
    let messages = chatService.updateMessageInList(
      this.data.messages, msgId, () => ({ selectedDate: date })
    )

    // 同步日期到已存在的食物卡片
    const dateMsg = messages.find(m => m.id === msgId)
    if (dateMsg?.data?.cloudFileId) {
      const task = this.data.recognizingTasks[dateMsg.data.cloudFileId]
      if (task && task.cardMsgId) {
        messages = messages.map(msg => {
          if (msg.id === task.cardMsgId) {
            return { ...msg, data: { ...msg.data, selectedDate: date } }
          }
          return msg
        })
      }
    }

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

    // 同步日期到已存在的食物卡片
    let updatedMessages = messages
    const task = this.data.recognizingTasks[cloudFileId]
    if (task && task.cardMsgId) {
      updatedMessages = updatedMessages.map(msg => {
        if (msg.id === task.cardMsgId) {
          return { ...msg, data: { ...msg.data, selectedDate } }
        }
        return msg
      })
    }

    const nextMessage = selectedMealType
      ? createRatingSelectMessage(imageUrl, cloudFileId, selectedMealType, selectedDate)
      : (() => {
          const m = createMealTypeSelectMessage(imageUrl, cloudFileId)
          m.data.selectedDate = selectedDate
          return m
        })()

    this.setData({ messages: [...updatedMessages, nextMessage] })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  },

  /** 用户选择评分 → 同步到食物卡片，首次选择时创建卡片 */
  onRatingSelect(e) {
    const { value, msgId } = e.detail
    const messages = chatService.updateMessageInList(
      this.data.messages, msgId, () => ({ selectedRating: value, collapsed: true })
    )
    const ratingMsg = messages.find(m => m.id === msgId)
    if (!ratingMsg?.data) return

    const { cloudFileId, selectedMealType, selectedDate } = ratingMsg.data
    const taskKey = cloudFileId
    const task = this.data.recognizingTasks[taskKey]

    if (!task) {
      this.setData({ messages })
      chatService.saveMessages(this.data.messages)
      return
    }

    // 同步评分/餐次/日期到 recognizingTasks
    const updatedTasks = {
      ...this.data.recognizingTasks,
      [taskKey]: {
        ...task,
        selectedMealType,
        selectedRating: value,
        selectedDate: selectedDate || this.data.selectedDate
      }
    }

    // 若卡片已存在则同步更新，否则首次创建
    if (task.cardMsgId) {
      let updatedMessages = messages.map(msg => {
        if (msg.id === task.cardMsgId) {
          return {
            ...msg,
            data: {
              ...msg.data,
              mealType: selectedMealType || msg.data.mealType,
              rating: value,
              selectedDate: selectedDate || msg.data.selectedDate
            }
          }
        }
        return msg
      })
      this.setData({ messages: updatedMessages, recognizingTasks: updatedTasks })
      chatService.saveMessages(updatedMessages)
    } else {
      this.setData({ messages, recognizingTasks: updatedTasks })
      chatService.saveMessages(messages)
      // 首次评分 → 创建食物卡片
      this._showFoodCard(taskKey)
    }

    this.scrollToBottom()
  }
}
