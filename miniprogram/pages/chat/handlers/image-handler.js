/**
 * @fileoverview 图片处理模块
 * @description 处理图片选择、上传、AI识别流程，包括选择图片来源、上传图片、启动食物识别等功能
 * @module handlers/image-handler
 */

const { createImageMessage, createDateSelectMessage } = require('../../../utils/message-factory')
const { MESSAGE_ROLES } = require('../../../utils/constants')
const { formatDate, generateId } = require('../../../utils/helper')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')
const imageService = require('../../../services/image-service')

module.exports = {
  /**
   * 选择图片来源（拍照或相册）
   * @async
   * @param {void}
   * @returns {Promise<void>}
   * @description 显示图片来源选择对话框，选择后调用pickImage处理图片
   */
  async chooseImage() {
    try {
      const sourceType = await imageService.chooseImage()
      await this.pickImage(sourceType)
    } catch (error) {
      // 用户取消选择时不显示错误
      if (!error.errMsg?.includes('cancel')) {
        this.showErrorMessage('图片处理失败，请重试')
      }
    }
  },

  /**
   * 选择并处理图片
   * @async
   * @param {string} sourceType - 图片来源类型（camera/album）
   * @returns {Promise<void>}
   * @description 从指定来源选择图片，上传至云存储，创建日期选择消息，启动AI识别
   */
  async pickImage(sourceType) {
    try {
      // 获取图片临时文件路径
      const tempFilePath = await imageService.pickImage(sourceType)
      // 创建用户图片消息
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

      this.setData({
        messages: [...this.data.messages, dateMessage],
        currentImageUrl: tempUrl,
        currentCloudFileId: fileID,
        selectedDate: pendingRecord?.date || todayStr,
        pendingRecord: null
      })
      chatService.saveMessages(this.data.messages)
      this.scrollToBottom()

      await this.startRecognition(tempUrl, fileID, dateMessage.id)
    } catch (error) {
      console.error('Image process error:', error)
      // 用户取消时不显示错误
      if (!error.errMsg?.includes('cancel')) {
        this.showErrorMessage('图片处理失败，请重试')
        this.setData({ isLoading: false })
      }
    }
  },

  /**
   * 启动AI食物识别
   * @async
   * @param {string} imageUrl - 图片URL
   * @param {string} cloudFileId - 云存储文件ID
   * @param {string} mealTypeMsgId - 餐次选择消息ID
   * @returns {Promise<void>}
   * @description 调用AI接口识别图片中的食物，存储识别任务状态
   */
  async startRecognition(imageUrl, cloudFileId, mealTypeMsgId) {
    // 使用 cloudFileId 作为任务键，避免 URL 中的特殊字符问题
    const taskKey = cloudFileId
    
    // 初始化识别任务状态
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
    
    console.log('startRecognition: 初始化识别任务, taskKey:', taskKey)
    console.log('recognizingTasks:', this.data.recognizingTasks)

    try {
      // 调用AI识别接口
      const recognizeResult = await safeApiCall(() => api.food.recognize(imageUrl))
      
      console.log('startRecognition: 识别结果', recognizeResult)

      // 存储识别结果
      const currentTask = this.data.recognizingTasks[taskKey]
      this.setData({
        recognizingTasks: {
          ...this.data.recognizingTasks,
          [taskKey]: {
            ...currentTask,
            result: recognizeResult,
            completed: true
          }
        }
      })

      // 检查并显示识别结果
      this.checkAndShowResult(taskKey)
    } catch (error) {
      console.error('Recognition error:', error)
      // 标记识别任务出错
      const currentTask = this.data.recognizingTasks[taskKey]
      this.setData({
        recognizingTasks: {
          ...this.data.recognizingTasks,
          [taskKey]: {
            ...currentTask,
            error: error,
            completed: true
          }
        }
      })
    }
  },

  /**
   * 检查并显示识别结果
   * @param {string} taskKey - 识别任务键（cloudFileId）
   * @returns {void}
   * @description 检查识别任务状态，验证用户是否已完成餐次、日期、评分选择，满足条件则显示食物卡片
   */
  checkAndShowResult(taskKey) {
    const task = this.data.recognizingTasks[taskKey]
    
    // 调试日志
    console.log('checkAndShowResult called with taskKey:', taskKey)
    console.log('task:', task ? { 
      completed: task.completed, 
      selectedMealType: task.selectedMealType, 
      selectedRating: task.selectedRating, 
      selectedDate: task.selectedDate, 
      resultShown: task.resultShown 
    } : 'undefined')
    
    // 验证任务状态和用户选择是否完整
    if (!task || !task.completed || !task.selectedMealType || task.selectedRating === null || !task.selectedDate || task.resultShown) {
      console.log('checkAndShowResult: 条件不满足，不显示结果')
      console.log('条件检查:', {
        hasTask: !!task,
        completed: task?.completed,
        hasMealType: !!task?.selectedMealType,
        hasRating: task?.selectedRating !== null,
        hasDate: !!task?.selectedDate,
        resultShown: task?.resultShown
      })
      return
    }

    const recognizeResult = task.result
    // 验证识别结果
    if (!recognizeResult.success || !recognizeResult.data?.foods) {
      this.showErrorMessage(recognizeResult.error || recognizeResult.message || '无法识别图片中的食物')
      return
    }

    const result = recognizeResult.data
    
    // 验证 foods 数组有效性
    if (!Array.isArray(result.foods) || result.foods.length === 0) {
      this.showErrorMessage('未识别到任何食物，请尝试重新拍摄')
      return
    }
    
    // 处理识别到的食物数据，确保必要字段存在
    const foods = result.foods.map(food => ({ 
      ...food, 
      imageUrl: task.cloudFileId,
      // 确保必要字段存在，设置默认值
      id: food.id || `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: food.name || '未知食物',
      category: food.category || '其他',
      score: food.score || 60,
      tags: food.tags || { positive: [], warning: [] },
      tagReasons: food.tagReasons || {}
    }))
    
    // 构建餐食概览数据
    const mealOverview = result.mealOverview || {
      overallHealthScore: 60,
      healthTags: { positive: [], warning: [] },
      tagReasons: {},
      summary: `识别到：${foods.map(f => f.name).join('、')}`
    }
    
    // 确保 mealOverview 的必要字段存在
    mealOverview.healthTags = mealOverview.healthTags || { positive: [], warning: [] }
    mealOverview.tagReasons = mealOverview.tagReasons || {}

    // 创建食物卡片消息
    const { createFoodCardMessage } = require('../../../utils/message-factory')
    const foodCardMessage = createFoodCardMessage(foods, mealOverview, result.dietaryAdvice || '', generateId())
    // 绑定卡片相关数据
    Object.assign(foodCardMessage.data, {
      imageUrl: task.imageUrl,
      mealType: task.selectedMealType,
      rating: task.selectedRating,
      cloudFileId: task.cloudFileId,
      selectedDate: task.selectedDate || this.data.selectedDate
    })

    console.log('checkAndShowResult: 创建食物卡片消息', foodCardMessage)

    // 更新消息列表，标记结果已显示
    const currentTask = this.data.recognizingTasks[taskKey]
    
    // 移除等待消息（识别中类型 或 包含"AI 正在识别中"的文本消息）
    const filteredMessages = this.data.messages.filter(msg => 
      msg.type !== 'recognizing' && !(msg.type === 'text' && msg.content.includes('AI 正在识别中'))
    )
    
    this.setData({
      messages: [...filteredMessages, foodCardMessage],
      recognizingTasks: {
        ...this.data.recognizingTasks,
        [taskKey]: {
          ...currentTask,
          resultShown: true
        }
      }
    })
    chatService.saveMessages(this.data.messages)
    this.scrollToBottom()
  }
}
