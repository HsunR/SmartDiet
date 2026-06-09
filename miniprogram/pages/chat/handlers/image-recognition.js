/**
 * image-recognition.js — 图片选择与 AI 食物识别（SSE 流式版）
 *
 * 职责：
 * - chooseImage             弹出来源选择（拍照/相册）
 * - pickImage               拍照/选图 → 上传 → 插入日期选择 → 启动 SSE 流式识别（后台缓冲）
 * - _startStreamRecognition 发起 SSE 流式请求，结果缓冲到 recognizingTasks
 * - _showFoodCard           在评分选定后创建食物卡片，填充已有数据，继续接收流式更新
 *
 * 关键数据流：
 *   选图 → 上传 → SSE 后台流式 → 结果缓冲在 recognizingTasks.streamData
 *   用户完成日期/餐次/评分选择 → _showFoodCard 创建骨架卡片
 *   SSE 后续事件 → 更新已创建的卡片
 */

const { createImageMessage, createDateSelectMessage, createFoodCardSkeleton } = require('../../../utils/message-factory')
const { MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, generateId } = require('../../../utils/helper')
const { api } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')
const imageService = require('../../../services/image-service')

module.exports = {

  /** 弹出拍照/相册选择 → pickImage */
  async chooseImage() {
    try {
      const sourceType = await imageService.chooseImage()
      await this.pickImage(sourceType)
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) {
        this.showErrorMessage('图片处理失败，请重试')
      }
    }
  },

  /** 选图 → 上传 → 插入日期选择 → 启动 SSE 流式识别（后台缓冲，不立即显示卡片） */
  async pickImage(sourceType) {
    try {
      const tempFilePath = await imageService.pickImage(sourceType)
      const userMessage = createImageMessage(MESSAGE_ROLES.USER, tempFilePath)
      this.setData({ messages: [...this.data.messages, userMessage] })
      chatService.saveMessages(this.data.messages)
      this.scrollToBottom()

      const { fileID, tempUrl } = await imageService.processImage(tempFilePath)
      const { pendingRecord } = this.data
      const todayStr = formatDate(new Date())

      const dateMessage = createDateSelectMessage(
        tempUrl, fileID,
        pendingRecord?.date || todayStr,
        pendingRecord?.mealType || null
      )

      const selectedDate = pendingRecord?.date || todayStr

      this.setData({
        messages: [...this.data.messages, dateMessage],
        currentImageUrl: tempUrl,
        currentCloudFileId: fileID,
        selectedDate: selectedDate,
        pendingRecord: null,
        recognizingTasks: {
          ...this.data.recognizingTasks,
          [fileID]: {
            imageUrl: tempUrl,
            cloudFileId: fileID,
            cardMsgId: null,
            mealTypeMsgId: dateMessage.id,
            startTime: Date.now(),
            completed: false,
            selectedDate: selectedDate,
            selectedMealType: null,
            selectedRating: null,
            resultShown: false,
            streamData: { overview: null, foods: [], dietaryAdvice: '', completed: false, error: null }
          }
        }
      })
      chatService.saveMessages(this.data.messages)
      this.scrollToBottom()

      this._startStreamRecognition(tempUrl, fileID)
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) {
        console.error('Image process error:', error)
        this.showErrorMessage('图片处理失败，请重试')
        this.setData({ isLoading: false })
      }
    }
  },

  /** 发起 SSE 流式识别，结果缓冲到 recognizingTasks；若卡片已创建则同步更新 */
  _startStreamRecognition(imageUrl, cloudFileId) {
    const taskKey = cloudFileId

    api.food.recognizeStream(
      imageUrl,
      (overview) => {
        this._updateStreamData(taskKey, 'overview', overview)
      },
      (foodData) => {
        const foodItem = {
          id: foodData.id || `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: foodData.name || '未知食物',
          category: foodData.category || '其他',
          score: foodData.score || 60,
          weight: foodData.weight || 100,
          tags: foodData.tags || { positive: [], warning: [] },
          tagReasons: foodData.tagReasons || {},
          advice: foodData.advice || ''
        }
        this._updateStreamData(taskKey, 'food_item', foodItem)
      },
      (doneData) => {
        const task = this.data.recognizingTasks[taskKey]
        if (!task) return
        const streamData = { ...task.streamData, dietaryAdvice: doneData.dietaryAdvice || '', completed: true, mealOverview: doneData.mealOverview || task.streamData.overview }
        const updatedTasks = {
          ...this.data.recognizingTasks,
          [taskKey]: { ...task, completed: true, streamData }
        }
        const cardMsgId = task.cardMsgId
        if (cardMsgId) {
          const messages = this.data.messages.map(msg => {
            if (msg.id !== cardMsgId) return msg
            return {
              ...msg,
              data: {
                ...msg.data,
                dietaryAdvice: doneData.dietaryAdvice || msg.data.dietaryAdvice,
                mealOverview: streamData.overview || msg.data.mealOverview,
                isStreaming: false
              }
            }
          })
          this.setData({ messages, recognizingTasks: updatedTasks })
          chatService.saveMessages(messages)
        } else {
          this.setData({ recognizingTasks: updatedTasks })
        }
        this.scrollToBottom()
      },
      (errorMsg) => {
        const task = this.data.recognizingTasks[taskKey]
        if (!task) return
        const streamData = { ...task.streamData, error: errorMsg, completed: true }
        const cardMsgId = task.cardMsgId
        if (cardMsgId) {
          const { createTextMessage } = require('../../../utils/message-factory')
          const errorMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, `❌ ${errorMsg}`)
          const messages = this.data.messages.map(msg =>
            msg.id === cardMsgId ? errorMessage : msg
          )
          this.setData({ messages, recognizingTasks: { ...this.data.recognizingTasks, [taskKey]: { ...task, completed: true, streamData } } })
          chatService.saveMessages(messages)
        } else {
          this.setData({ recognizingTasks: { ...this.data.recognizingTasks, [taskKey]: { ...task, completed: true, streamData } } })
        }
      }
    )
  },

  /** 更新缓冲的流式数据，若卡片已存在则同步更新 UI */
  _updateStreamData(taskKey, eventType, data) {
    const task = this.data.recognizingTasks[taskKey]
    if (!task) return

    const streamData = { ...task.streamData }
    if (eventType === 'overview') {
      streamData.overview = data
    } else if (eventType === 'food_item') {
      streamData.foods = [...streamData.foods, data]
    }

    const cardMsgId = task.cardMsgId
    if (cardMsgId) {
      const messages = this.data.messages.map(msg => {
        if (msg.id !== cardMsgId) return msg
        if (eventType === 'overview') {
          return { ...msg, data: { ...msg.data, mealOverview: data } }
        }
        if (eventType === 'food_item') {
          return { ...msg, data: { ...msg.data, foods: [...(msg.data.foods || []), data] } }
        }
        return msg
      })
      this.setData({ messages, recognizingTasks: { ...this.data.recognizingTasks, [taskKey]: { ...task, streamData } } })
      this.scrollToBottom()
    } else {
      this.setData({ recognizingTasks: { ...this.data.recognizingTasks, [taskKey]: { ...task, streamData } } })
    }
  },

  /**
   * 评分选定后由 selection.js 调用，创建食物卡片
   * @param {string} taskKey - cloudFileId
   */
  _showFoodCard(taskKey) {
    const task = this.data.recognizingTasks[taskKey]
    if (!task || task.resultShown) return

    const streamData = task.streamData || { overview: null, foods: [], dietaryAdvice: '', completed: false }

    const recordId = generateId()
    const skeletonCard = createFoodCardSkeleton(
      recordId,
      task.imageUrl,
      task.cloudFileId,
      task.selectedDate || this.data.selectedDate
    )
    skeletonCard.data.mealType = task.selectedMealType || ''
    skeletonCard.data.rating = task.selectedRating || 0

    if (streamData.overview) {
      skeletonCard.data.mealOverview = streamData.overview
    }
    if (streamData.foods.length > 0) {
      skeletonCard.data.foods = streamData.foods
    }
    if (streamData.dietaryAdvice) {
      skeletonCard.data.dietaryAdvice = streamData.dietaryAdvice
    }
    skeletonCard.data.isStreaming = !streamData.completed

    const cardMsgId = skeletonCard.id

    const filteredMessages = this.data.messages.filter(msg =>
      msg.type !== 'recognizing' && !(msg.type === 'text' && msg.content.includes('AI 正在识别中'))
    )

    this.setData({
      messages: [...filteredMessages, skeletonCard],
      recognizingTasks: {
        ...this.data.recognizingTasks,
        [taskKey]: { ...task, cardMsgId, resultShown: true }
      }
    })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  }
}
