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
  STORAGE_KEYS,
  CLOUD_ENV,
  DEFAULT_CALORIES_TARGET,
  ACTIVITY_LEVELS
}
