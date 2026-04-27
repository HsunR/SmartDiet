/**
 * @fileoverview 常量定义模块
 * @description 定义项目中使用的所有常量，包括消息类型、餐次类型、用户目标、存储键名等
 * @module utils/constants
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const { MESSAGE_TYPES, MEAL_TYPES, STORAGE_KEYS } = require('./constants');
 *
 * // 使用消息类型
 * if (message.type === MESSAGE_TYPES.TEXT) { ... }
 *
 * // 使用餐次类型
 * const mealType = MEAL_TYPES.find(t => t.value === 'breakfast');
 */

/**
 * 消息类型常量
 * @constant {Object}
 * @property {string} TEXT - 文本消息
 * @property {string} IMAGE - 图片消息
 * @property {string} FOOD_CARD - 食物卡片消息
 * @property {string} USER_INFO_FORM - 用户信息表单消息
 * @property {string} FEEDBACK_INPUT - 反馈输入消息
 * @property {string} QUICK_ACTIONS - 快捷操作消息
 * @property {string} MEAL_TYPE_PICKER - 餐次选择器消息（Picker模式）
 * @property {string} MEAL_TYPE_SELECT - 餐次选择消息（按钮模式）
 * @property {string} RATING_SELECT - 评分选择消息
 * @property {string} DATE_SELECT - 日期选择消息
 */
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FOOD_CARD: 'food_card',
  USER_INFO_FORM: 'user_info_form',
  FEEDBACK_INPUT: 'feedback_input',
  QUICK_ACTIONS: 'quick_actions',
  MEAL_TYPE_PICKER: 'meal_type_picker',
  MEAL_TYPE_SELECT: 'meal_type_select',
  RATING_SELECT: 'rating_select',
  DATE_SELECT: 'date_select'
}

/**
 * 消息角色常量
 * @constant {Object}
 * @property {string} USER - 用户发送的消息
 * @property {string} ASSISTANT - AI助手发送的消息
 */
const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
}

/**
 * 餐次类型数组
 * @constant {Array<Object>}
 * @property {string} value - 餐次标识值
 * @property {string} label - 餐次显示标签
 * @property {string} icon - 餐次图标
 */
const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐', icon: '🌅' },
  { value: 'lunch', label: '午餐', icon: '☀️' },
  { value: 'dinner', label: '晚餐', icon: '🌙' },
  { value: 'snack', label: '其他', icon: '🍎' }
]

/**
 * 评分选项数组
 * @constant {Array<Object>}
 * @property {number} value - 评分值 (0-5)
 * @property {string} label - 评分标签
 * @property {string} icon - 评分图标（星星）
 */
const RATING_OPTIONS = [
  { value: 5, label: '五星', icon: '⭐⭐⭐⭐⭐' },
  { value: 4, label: '四星', icon: '⭐⭐⭐⭐' },
  { value: 3, label: '三星', icon: '⭐⭐⭐' },
  { value: 2, label: '二星', icon: '⭐⭐' },
  { value: 1, label: '一星', icon: '⭐' },
  { value: 0, label: '待定', icon: '❓' }
]

/**
 * 用户体重目标常量
 * @constant {Object}
 * @property {string} LOSE_WEIGHT - 减脂
 * @property {string} MAINTAIN - 维持体重
 * @property {string} GAIN_MUSCLE - 增肌
 * @property {string} CONTROL_SUGAR - 控糖
 * @property {string} CONTROL_BLOOD_PRESSURE - 控血压
 */
const USER_GOALS = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN: 'maintain',
  GAIN_MUSCLE: 'gain_muscle',
  CONTROL_SUGAR: 'control_sugar',
  CONTROL_BLOOD_PRESSURE: 'control_blood_pressure'
}

/**
 * 用户目标选项数组（用于表单选择）
 * @constant {Array<Object>}
 * @property {string} value - 目标值
 * @property {string} label - 目标显示标签
 */
const GOAL_OPTIONS = [
  { value: USER_GOALS.LOSE_WEIGHT, label: '减脂' },
  { value: USER_GOALS.MAINTAIN, label: '维持体重' },
  { value: USER_GOALS.GAIN_MUSCLE, label: '增肌' },
  { value: USER_GOALS.CONTROL_SUGAR, label: '控糖' },
  { value: USER_GOALS.CONTROL_BLOOD_PRESSURE, label: '控血压' }
]

/**
 * 本地存储键名常量
 * @constant {Object}
 * @property {string} CHAT_MESSAGES - 聊天消息存储键
 * @property {string} USER_INFO - 用户信息存储键
 * @property {string} HAS_LOGIN - 登录状态存储键
 * @property {string} HAS_COMPLETED_ONBOARDING - 引导完成状态存储键
 */
const STORAGE_KEYS = {
  CHAT_MESSAGES: 'chat_messages',
  USER_INFO: 'userInfo',
  HAS_LOGIN: 'hasLogin',
  HAS_COMPLETED_ONBOARDING: 'hasCompletedOnboarding'
}

/**
 * 云开发环境ID
 * @constant {string}
 */
const CLOUD_ENV = 'cloud1-5g94ikff8709bdba'

/**
 * 默认卡路里目标值
 * @constant {number}
 * @description 当无法计算用户目标卡路里时使用的默认值（2000千卡/天）
 */
const DEFAULT_CALORIES_TARGET = 2000

/**
 * 活动水平系数常量
 * @constant {Object}
 * @property {number} SEDENTARY - 久坐不动 (1.2)
 * @property {number} LIGHT - 轻度活动 (1.375)
 * @property {number} MODERATE - 中度活动 (1.55)
 * @property {number} ACTIVE - 高度活动 (1.725)
 * @property {number} VERY_ACTIVE - 极高活动 (1.9)
 */
const ACTIVITY_LEVELS = {
  SEDENTARY: 1.2,      // 久坐不动，很少或不运动
  LIGHT: 1.375,        // 轻度活动，每周运动1-3天
  MODERATE: 1.55,      // 中度活动，每周运动3-5天
  ACTIVE: 1.725,       // 高度活动，每周运动6-7天
  VERY_ACTIVE: 1.9     // 极高活动，每天剧烈运动或体力劳动
}

/**
 * 导出所有常量
 * @exports constants
 */
module.exports = {
  MESSAGE_TYPES,
  MESSAGE_ROLES,
  MEAL_TYPES,
  RATING_OPTIONS,
  USER_GOALS,
  GOAL_OPTIONS,
  STORAGE_KEYS,
  CLOUD_ENV,
  DEFAULT_CALORIES_TARGET,
  ACTIVITY_LEVELS
}
