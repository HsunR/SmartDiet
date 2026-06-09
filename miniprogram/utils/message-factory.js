/**
 * @fileoverview 消息工厂模块
 * @description 统一创建各类聊天消息的工厂函数，包括文本、图片、食物卡片、交互组件等消息类型
 * @module utils/message-factory
 */

const { MESSAGE_TYPES, MESSAGE_ROLES } = require('./constants')
const { generateId } = require('./helper')

/**
 * 创建基础消息对象
 * @private
 * @param {string} type - 消息类型
 * @param {string} role - 消息角色 ('user' | 'assistant')
 * @param {string} [content=''] - 消息内容
 * @param {Object} [data={}] - 消息附加数据
 * @returns {Object} 基础消息对象
 */
const createBaseMessage = (type, role, content = '', data = {}) => ({
  id: generateId(),
  role,
  type,
  content,
  data,
  timestamp: Date.now()
})

/**
 * 创建文本消息
 * @param {string} role - 消息角色 ('user' | 'assistant')
 * @param {string} content - 文本内容
 * @returns {Object} 文本消息对象
 */
const createTextMessage = (role, content) =>
  createBaseMessage(MESSAGE_TYPES.TEXT, role, content)

/**
 * 创建图片消息
 * @param {string} role - 消息角色 ('user' | 'assistant')
 * @param {string} imageUrl - 图片URL
 * @param {string} [thumbnailUrl] - 缩略图URL，默认为原图
 * @returns {Object} 图片消息对象
 */
const createImageMessage = (role, imageUrl, thumbnailUrl) =>
  createBaseMessage(MESSAGE_TYPES.IMAGE, role, '', {
    imageUrl,
    thumbnailUrl: thumbnailUrl || imageUrl
  })

/**
 * 创建食物卡片消息
 * @param {Array<Object>} foods - 食物列表
 * @param {Object} mealOverview - 餐食概览信息
 * @param {string} dietaryAdvice - 饮食建议
 * @param {string} recordId - 记录ID
 * @returns {Object} 食物卡片消息对象
 */
const createFoodCardMessage = (foods, mealOverview, dietaryAdvice, recordId) => {
  const message = createBaseMessage(MESSAGE_TYPES.FOOD_CARD, MESSAGE_ROLES.ASSISTANT, '', {
    foods: foods || [],
    mealOverview: mealOverview || {
      mealType: '',
      overallHealthScore: 0,
      healthTags: { positive: [], warning: [] },
      summary: ''
    },
    dietaryAdvice: dietaryAdvice || '',
    recordId: recordId || ''
  })
  return message
}

/**
 * 创建餐次选择消息（按钮模式）
 * @param {string} imageUrl - 图片URL
 * @param {string} cloudFileId - 云存储文件ID
 * @returns {Object} 餐次选择消息对象
 */
const createMealTypeSelectMessage = (imageUrl, cloudFileId) =>
  createBaseMessage(MESSAGE_TYPES.MEAL_TYPE_SELECT, MESSAGE_ROLES.ASSISTANT, '请选择餐次：', {
    imageUrl,
    cloudFileId,
    mealTypes: [
      { value: 'breakfast', label: '🌅 早餐' },
      { value: 'lunch', label: '☀️ 午餐' },
      { value: 'dinner', label: '🌙 晚餐' },
      { value: 'other', label: '🍎 其他' }
    ],
    selectedMealType: '',
    collapsed: false
  })

/**
 * 创建评分选择消息
 * @param {string} imageUrl - 图片URL
 * @param {string} cloudFileId - 云存储文件ID
 * @param {string} [selectedMealType] - 已选择的餐次类型
 * @param {string} [selectedDate] - 已选择的日期
 * @returns {Object} 评分选择消息对象
 */
const createRatingSelectMessage = (imageUrl, cloudFileId, selectedMealType, selectedDate) =>
  createBaseMessage(MESSAGE_TYPES.RATING_SELECT, MESSAGE_ROLES.ASSISTANT, '给这餐打分：', {
    imageUrl,
    cloudFileId,
    ratings: [
      { value: 1, label: '1 星', icon: '⭐' },
      { value: 2, label: '2 星', icon: '⭐⭐' },
      { value: 3, label: '3 星', icon: '⭐⭐⭐' },
      { value: 4, label: '4 星', icon: '⭐⭐⭐⭐' },
      { value: 5, label: '5 星', icon: '⭐⭐⭐⭐⭐' }
    ],
    selectedRating: 0,
    selectedMealType: selectedMealType || '',
    selectedDate: selectedDate || '',
    collapsed: false
  })

/**
 * 创建日期选择消息
 * @param {string} imageUrl - 图片URL
 * @param {string} cloudFileId - 云存储文件ID
 * @param {string} [defaultDate] - 默认日期
 * @param {string} [defaultMealType] - 默认餐次类型
 * @returns {Object} 日期选择消息对象
 */
const createDateSelectMessage = (imageUrl, cloudFileId, defaultDate, defaultMealType) => {
  const todayStr = new Date().toISOString().split('T')[0]
  return createBaseMessage(MESSAGE_TYPES.DATE_SELECT, MESSAGE_ROLES.ASSISTANT, '选择用餐日期：', {
    imageUrl,
    cloudFileId,
    selectedDate: defaultDate || todayStr,
    selectedMealType: defaultMealType || '',
    collapsed: false
  })
}

/**
 * 创建反馈输入消息
 * @param {Array<Object>} foods - 食物列表
 * @param {Object} mealOverview - 餐食概览信息
 * @param {string} imageUrl - 图片URL
 * @returns {Object} 反馈输入消息对象
 */
const createFeedbackInputMessage = (foods, mealOverview, imageUrl) =>
  createBaseMessage(MESSAGE_TYPES.FEEDBACK_INPUT, MESSAGE_ROLES.ASSISTANT, '请告诉我识别结果有什么问题，我会重新分析：', {
    foods,
    mealOverview,
    imageUrl
  })

/**
 * 创建快捷操作消息
 * @param {Array<Object>} [actions] - 自定义操作列表
 * @returns {Object} 快捷操作消息对象
 */
const createQuickActionsMessage = (actions) =>
  createBaseMessage(MESSAGE_TYPES.QUICK_ACTIONS, MESSAGE_ROLES.ASSISTANT, '您还可以：', {
    actions: actions || [
      { id: 'photo', label: '拍照识别', icon: '📷' },
      { id: 'report', label: '今日报告', icon: '📊' },
      { id: 'recommend', label: '饮食建议', icon: '💡' }
    ]
  })

/**
 * 创建识别中等待消息
 * @returns {Object} 识别中消息对象
 */
const createRecognizingMessage = () =>
  createBaseMessage('recognizing', MESSAGE_ROLES.ASSISTANT, 'AI 正在识别中，请稍候...', {
    isRecognizing: true
  })

/**
 * 创建食物卡片骨架消息（流式识别前先展示骨架）
 * @param {string} recordId - 记录ID
 * @param {string} imageUrl - 图片URL
 * @param {string} cloudFileId - 云存储文件ID
 * @param {string} selectedDate - 选择日期
 * @returns {Object} 骨架食物卡片消息对象
 */
const createFoodCardSkeleton = (recordId, imageUrl, cloudFileId, selectedDate) =>
  createBaseMessage(MESSAGE_TYPES.FOOD_CARD, MESSAGE_ROLES.ASSISTANT, '', {
    foods: [],
    mealOverview: {
      overallHealthScore: 0,
      healthTags: { positive: [], warning: [] },
      tagReasons: {},
      summary: '正在分析食物...'
    },
    dietaryAdvice: '',
    recordId: recordId || '',
    imageUrl: imageUrl || '',
    cloudFileId: cloudFileId || '',
    selectedDate: selectedDate || '',
    mealType: '',
    rating: 0,
    isStreaming: true
  })

module.exports = {
  createTextMessage,
  createImageMessage,
  createFoodCardMessage,
  createMealTypeSelectMessage,
  createRatingSelectMessage,
  createDateSelectMessage,
  createFeedbackInputMessage,
  createQuickActionsMessage,
  createRecognizingMessage,
  createFoodCardSkeleton
}