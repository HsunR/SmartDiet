/**
 * @fileoverview 消息工厂模块
 * @description 统一创建各类聊天消息的工厂函数，包括文本、图片、食物卡片、交互组件等消息类型
 * @module utils/message-factory
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const messageFactory = require('./message-factory');
 *
 * // 创建文本消息
 * const textMsg = messageFactory.createTextMessage('user', '你好');
 *
 * // 创建图片消息
 * const imageMsg = messageFactory.createImageMessage('user', 'https://example.com/image.jpg');
 *
 * // 创建食物卡片消息
 * const foodCardMsg = messageFactory.createFoodCardMessage(foods, mealOverview, advice, recordId);
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
 * @property {string} id - 消息唯一ID
 * @property {string} role - 消息角色
 * @property {string} type - 消息类型
 * @property {string} content - 消息内容
 * @property {Object} data - 消息附加数据
 * @property {number} timestamp - 消息时间戳
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
 * @example
 * const userMsg = createTextMessage('user', '今天吃什么好？');
 * const aiMsg = createTextMessage('assistant', '建议多吃蔬菜水果');
 */
const createTextMessage = (role, content) =>
  createBaseMessage(MESSAGE_TYPES.TEXT, role, content)

/**
 * 创建图片消息
 * @param {string} role - 消息角色 ('user' | 'assistant')
 * @param {string} imageUrl - 图片URL
 * @param {string} [thumbnailUrl] - 缩略图URL，默认为原图
 * @returns {Object} 图片消息对象
 * @example
 * const imageMsg = createImageMessage('user', 'https://example.com/food.jpg');
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
 * @example
 * const foodCardMsg = createFoodCardMessage(
 *   [{ name: '米饭', score: 75 }],
 *   { overallHealthScore: 80 },
 *   '建议搭配蔬菜食用',
 *   'record_123'
 * );
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
 * 创建餐次选择器消息（Picker模式）
 * @param {string} imageUrl - 图片URL
 * @param {string} cloudFileId - 云存储文件ID
 * @returns {Object} 餐次选择器消息对象
 * @example
 * const pickerMsg = createMealTypePickerMessage('https://example.com/food.jpg', 'cloud://...');
 */
const createMealTypePickerMessage = (imageUrl, cloudFileId) =>
  createBaseMessage(MESSAGE_TYPES.MEAL_TYPE_PICKER, MESSAGE_ROLES.ASSISTANT, '请选择餐次：', {
    imageUrl,
    cloudFileId,
    mealTypes: [
      { value: 'breakfast', label: '🌅 早餐' },
      { value: 'lunch', label: '☀️ 午餐' },
      { value: 'dinner', label: '🌙 晚餐' },
      { value: 'other', label: '🍎 其他' }
    ],
    completed: false
  })

/**
 * 创建餐次选择消息（按钮模式）
 * @param {string} imageUrl - 图片URL
 * @param {string} cloudFileId - 云存储文件ID
 * @returns {Object} 餐次选择消息对象
 * @example
 * const selectMsg = createMealTypeSelectMessage('https://example.com/food.jpg', 'cloud://...');
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
 * @example
 * const ratingMsg = createRatingSelectMessage('https://example.com/food.jpg', 'cloud://...', 'lunch', '2024-01-15');
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
 * @example
 * const dateMsg = createDateSelectMessage('https://example.com/food.jpg', 'cloud://...', '2024-01-15', 'lunch');
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
 * @example
 * const feedbackMsg = createFeedbackInputMessage(foods, mealOverview, 'https://example.com/food.jpg');
 */
const createFeedbackInputMessage = (foods, mealOverview, imageUrl) =>
  createBaseMessage(MESSAGE_TYPES.FEEDBACK_INPUT, MESSAGE_ROLES.ASSISTANT, '请告诉我识别结果有什么问题，我会重新分析：', {
    foods,
    mealOverview,
    imageUrl
  })

/**
 * 创建用户信息表单消息
 * @returns {Object} 用户信息表单消息对象
 * @example
 * const formMsg = createUserInfoFormMessage();
 */
const createUserInfoFormMessage = () =>
  createBaseMessage(MESSAGE_TYPES.USER_INFO_FORM, MESSAGE_ROLES.ASSISTANT, '为了给您提供更精准的饮食建议，请先完善您的个人信息：', {
    fields: [
      { key: 'age', label: '年龄', type: 'number', placeholder: '请输入年龄' },
      { key: 'gender', label: '性别', type: 'picker', options: ['男', '女'] },
      { key: 'height', label: '身高 (cm)', type: 'number', placeholder: '请输入身高' },
      { key: 'weight', label: '体重 (kg)', type: 'number', placeholder: '请输入体重' },
      { key: 'goals', label: '健康目标', type: 'multiPicker', options: [
        { value: 'lose_weight', label: '减脂' },
        { value: 'maintain', label: '维持体重' },
        { value: 'gain_muscle', label: '增肌' },
        { value: 'control_sugar', label: '控糖' },
        { value: 'control_blood_pressure', label: '控血压' }
      ]}
    ]
  })

/**
 * 创建快捷操作消息
 * @param {Array<Object>} [actions] - 自定义操作列表
 * @returns {Object} 快捷操作消息对象
 * @example
 * // 使用默认操作
 * const quickActionsMsg = createQuickActionsMessage();
 *
 * // 自定义操作
 * const customActions = [
 *   { id: 'photo', label: '拍照', icon: '📷' },
 *   { id: 'history', label: '历史', icon: '📜' }
 * ];
 * const customMsg = createQuickActionsMessage(customActions);
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
 * 导出消息工厂函数
 * @exports messageFactory
 */
module.exports = {
  /**
   * 创建文本消息
   * @type {Function}
   */
  createTextMessage,
  /**
   * 创建图片消息
   * @type {Function}
   */
  createImageMessage,
  /**
   * 创建食物卡片消息
   * @type {Function}
   */
  createFoodCardMessage,
  /**
   * 创建餐次选择器消息（Picker模式）
   * @type {Function}
   */
  createMealTypePickerMessage,
  /**
   * 创建餐次选择消息（按钮模式）
   * @type {Function}
   */
  createMealTypeSelectMessage,
  /**
   * 创建评分选择消息
   * @type {Function}
   */
  createRatingSelectMessage,
  /**
   * 创建日期选择消息
   * @type {Function}
   */
  createDateSelectMessage,
  /**
   * 创建反馈输入消息
   * @type {Function}
   */
  createFeedbackInputMessage,
  /**
   * 创建用户信息表单消息
   * @type {Function}
   */
  createUserInfoFormMessage,
  /**
   * 创建快捷操作消息
   * @type {Function}
   */
  createQuickActionsMessage
}
