/**
 * @fileoverview 工具函数统一入口文件
 * @description 集中导出所有工具模块，包括格式化、验证、存储、辅助函数、计算器等
 * @module utils/index
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const utils = require('./utils');
 * const formattedDate = utils.formatDate(new Date());
 * const isValid = utils.isValidEmail('test@example.com');
 */

/**
 * 格式化工具模块
 * @type {Object}
 * @property {Function} formatNumber - 格式化数字
 * @property {Function} formatDate - 格式化日期
 * @property {Function} formatRelativeTime - 格式化相对时间
 * @property {Function} formatCalories - 格式化卡路里
 */
const formatter = require('./formatter')

/**
 * 验证工具模块
 * @type {Object}
 * @property {Function} isValidNumber - 验证数字
 * @property {Function} isValidEmail - 验证邮箱
 * @property {Function} isValidPhone - 验证手机号
 * @property {Function} isProfileComplete - 验证档案完整性
 * @property {Function} isValidFoodData - 验证食物数据
 */
const validator = require('./validator')

/**
 * 本地存储工具模块
 * @type {Object}
 * @property {Function} set - 设置存储
 * @property {Function} get - 获取存储
 * @property {Function} remove - 删除存储
 * @property {Function} clear - 清空存储
 */
const storage = require('./storage')

/**
 * 通用辅助函数模块
 * @type {Object}
 * @property {Function} generateId - 生成唯一ID
 * @property {Function} debounce - 防抖函数
 * @property {Function} throttle - 节流函数
 * @property {Function} compressImage - 压缩图片
 * @property {Function} uploadFile - 上传文件
 * @property {Function} getTempFileURL - 获取临时链接
 * @property {Function} uploadAndGetUrl - 上传并获取链接
 * @property {Function} getCurrentMealType - 获取当前餐次
 * @property {Function} getMealTypeLabel - 获取餐次标签
 */
const helper = require('./helper')

/**
 * 营养计算工具模块
 * @type {Object}
 * @property {Function} calculateBMR - 计算基础代谢率
 * @property {Function} calculateTDEE - 计算每日总消耗
 * @property {Function} calculateTargetCalories - 计算目标卡路里
 * @property {Function} calculateNutrientTargets - 计算营养素目标
 * @property {Function} calculateHealthScore - 计算健康评分
 */
const calculator = require('./calculator')

/**
 * 常量定义模块
 * @type {Object}
 * @property {Object} MESSAGE_TYPES - 消息类型
 * @property {Object} MESSAGE_ROLES - 消息角色
 * @property {Array} MEAL_TYPES - 餐次类型
 * @property {Array} RATING_OPTIONS - 评分选项
 * @property {Object} USER_GOALS - 用户目标
 * @property {Array} GOAL_OPTIONS - 目标选项
 * @property {Object} STORAGE_KEYS - 存储键名
 * @property {string} CLOUD_ENV - 云环境ID
 * @property {number} DEFAULT_CALORIES_TARGET - 默认卡路里目标
 * @property {Object} ACTIVITY_LEVELS - 活动水平
 */
const constants = require('./constants')

/**
 * 消息工厂模块
 * @type {Object}
 * @property {Function} createTextMessage - 创建文本消息
 * @property {Function} createImageMessage - 创建图片消息
 * @property {Function} createFoodCardMessage - 创建食物卡片消息
 * @property {Function} createMealTypePickerMessage - 创建餐次选择器消息
 * @property {Function} createMealTypeSelectMessage - 创建餐次选择消息
 * @property {Function} createRatingSelectMessage - 创建评分选择消息
 * @property {Function} createDateSelectMessage - 创建日期选择消息
 * @property {Function} createFeedbackInputMessage - 创建反馈输入消息
 * @property {Function} createUserInfoFormMessage - 创建用户信息表单消息
 * @property {Function} createQuickActionsMessage - 创建快捷操作消息
 */
const messageFactory = require('./message-factory')

/**
 * API 请求封装模块
 * @type {Object}
 * @property {Function} ApiError - API错误类
 * @property {Object} cloud - 云开发操作对象
 * @property {Object} api - 业务API接口
 * @property {Function} safeApiCall - 安全API调用包装器
 */
const api = require('./api')

/**
 * 统一导出所有工具函数
 * @exports utils
 */
module.exports = {
  ...formatter,
  ...validator,
  ...storage,
  ...helper,
  ...calculator,
  ...constants,
  ...messageFactory,
  ...api
}
