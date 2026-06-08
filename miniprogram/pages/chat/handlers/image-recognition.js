/**
 * image-recognition.js — 图片选择与 AI 食物识别
 *
 * 职责：
 * - chooseImage        弹出来源选择（拍照/相册）
 * - pickImage          拍照/选图 → 上传 → 插入日期选择消息 → 启动识别
 * - startRecognition   调用 FastAPI 食物识别接口，结果存入 recognizingTasks
 * - checkAndShowResult 用户完成餐次/日期/评分选择后，将识别结果渲染为食物卡片
 *
 * 关键数据流：
 *   recognizingTasks[cloudFileId] = {
 *     completed, result, selectedMealType, selectedRating, selectedDate, resultShown
 *   }
 */

const { createImageMessage, createDateSelectMessage } = require('../../../utils/message-factory')
const { MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, generateId } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
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

  /** 选图 → 上传 → 插入日期选择消息 → 启动识别 */
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

      // 插入日期选择器（用户指定餐次归属日期）
      const dateMessage = createDateSelectMessage(
        tempUrl, fileID,
        pendingRecord?.date || todayStr,
        pendingRecord?.mealType || null
      )

      this.setData({
        messages: [...this.data.messages, dateMessage],
        currentImageUrl: tempUrl,
        currentCloudFileId: fileID,
        selectedDate: pendingRecord?.date || todayStr,
        pendingRecord: null
      })
      chatService.saveMessages(this.data.messages)
      this.scrollToBottom()

      // 后台启动 AI 识别
      await this.startRecognition(tempUrl, fileID, dateMessage.id)
    } catch (error) {
      if (!error.errMsg?.includes('cancel')) {
        console.error('Image process error:', error)
        this.showErrorMessage('图片处理失败，请重试')
        this.setData({ isLoading: false })
      }
    }
  },

  /** 调用 FastAPI 食物识别接口，结果存入 recognizingTasks */
  async startRecognition(imageUrl, cloudFileId, mealTypeMsgId) {
    const taskKey = cloudFileId

    this.setData({
      recognizingTasks: {
        ...this.data.recognizingTasks,
        [taskKey]: {
          imageUrl, cloudFileId, mealTypeMsgId,
          startTime: Date.now(),
          selectedDate: null, selectedMealType: null, selectedRating: null
        }
      }
    })

    try {
      const recognizeResult = await safeApiCall(() => api.food.recognize(imageUrl))
      const currentTask = this.data.recognizingTasks[taskKey]
      this.setData({
        recognizingTasks: {
          ...this.data.recognizingTasks,
          [taskKey]: { ...currentTask, result: recognizeResult, completed: true }
        }
      })
      this.checkAndShowResult(taskKey)
    } catch (error) {
      console.error('Recognition error:', error)
      const currentTask = this.data.recognizingTasks[taskKey]
      this.setData({
        recognizingTasks: {
          ...this.data.recognizingTasks,
          [taskKey]: { ...currentTask, error, completed: true }
        }
      })
    }
  },

  /**
   * 检查识别任务状态，满足条件（识别完成 + 用户选择了餐次/日期/评分）
   * 则移除 waiting 消息，插入食物卡片
   */
  checkAndShowResult(taskKey) {
    const task = this.data.recognizingTasks[taskKey]
    if (!task || !task.completed || !task.selectedMealType || task.selectedRating === null || !task.selectedDate || task.resultShown) {
      return
    }

    const recognizeResult = task.result
    if (!recognizeResult.success || !recognizeResult.data?.foods) {
      this.showErrorMessage(recognizeResult.error || recognizeResult.message || '无法识别图片中的食物')
      return
    }

    const result = recognizeResult.data
    if (!Array.isArray(result.foods) || result.foods.length === 0) {
      this.showErrorMessage('未识别到任何食物，请尝试重新拍摄')
      return
    }

    // 补全食物数据必要字段
    const foods = result.foods.map(food => ({
      ...food,
      imageUrl: task.cloudFileId,
      id: food.id || `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: food.name || '未知食物',
      category: food.category || '其他',
      score: food.score || 60,
      tags: food.tags || { positive: [], warning: [] },
      tagReasons: food.tagReasons || {}
    }))

    const mealOverview = result.mealOverview || {
      overallHealthScore: 60,
      healthTags: { positive: [], warning: [] },
      tagReasons: {},
      summary: `识别到：${foods.map(f => f.name).join('、')}`
    }
    mealOverview.healthTags = mealOverview.healthTags || { positive: [], warning: [] }
    mealOverview.tagReasons = mealOverview.tagReasons || {}

    // 创建食物卡片并绑定用户选择信息
    const { createFoodCardMessage } = require('../../../utils/message-factory')
    const foodCardMessage = createFoodCardMessage(foods, mealOverview, result.dietaryAdvice || '', generateId())
    Object.assign(foodCardMessage.data, {
      imageUrl: task.imageUrl,
      mealType: task.selectedMealType,
      rating: task.selectedRating,
      cloudFileId: task.cloudFileId,
      selectedDate: task.selectedDate || this.data.selectedDate
    })

    // 移除 waiting 态消息（recognizing 类型或含"AI 正在识别中"的文本）
    const currentTask = this.data.recognizingTasks[taskKey]
    const filteredMessages = this.data.messages.filter(msg =>
      msg.type !== 'recognizing' && !(msg.type === 'text' && msg.content.includes('AI 正在识别中'))
    )

    this.setData({
      messages: [...filteredMessages, foodCardMessage],
      recognizingTasks: {
        ...this.data.recognizingTasks,
        [taskKey]: { ...currentTask, resultShown: true }
      }
    })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  }
}
