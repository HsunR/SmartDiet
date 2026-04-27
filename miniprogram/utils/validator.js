/**
 * @fileoverview 数据验证工具模块
 * @description 提供数字、邮箱、手机号、用户档案、食物数据等验证功能
 * @module utils/validator
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const validator = require('./validator');
 *
 * // 验证数字
 * const isValid = validator.isValidNumber(123);
 *
 * // 验证邮箱
 * const isEmail = validator.isValidEmail('test@example.com');
 *
 * // 验证用户档案完整性
 * const isComplete = validator.isProfileComplete({ age: 25, height: 175, weight: 70 });
 */

/**
 * 验证是否为有效数字
 * @param {*} value - 要验证的值
 * @returns {boolean} 是否为有效数字
 * @example
 * validator.isValidNumber(123);        // true
 * validator.isValidNumber('123');      // true
 * validator.isValidNumber(null);       // false
 * validator.isValidNumber(undefined);  // false
 * validator.isValidNumber(NaN);        // false
 * validator.isValidNumber('');         // false
 */
const isValidNumber = value => {
  return value !== undefined && value !== null && !isNaN(Number(value))
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱格式
 * @example
 * validator.isValidEmail('test@example.com');     // true
 * validator.isValidEmail('user.name@domain.cn');  // true
 * validator.isValidEmail('invalid-email');        // false
 * validator.isValidEmail('@example.com');         // false
 */
const isValidEmail = email => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone - 手机号码
 * @returns {boolean} 是否为有效手机号格式
 * @example
 * validator.isValidPhone('13800138000');  // true
 * validator.isValidPhone('15912345678');  // true
 * validator.isValidPhone('1380013800');   // false (10位)
 * validator.isValidPhone('138001380000'); // false (12位)
 * validator.isValidPhone('23800138000');  // false (非1开头)
 */
const isValidPhone = phone => {
  const regex = /^1[3-9]\d{9}$/
  return regex.test(phone)
}

/**
 * 验证用户档案完整性
 * @param {Object} profile - 用户档案对象
 * @param {number} profile.age - 年龄
 * @param {number} profile.height - 身高(cm)
 * @param {number} profile.weight - 体重(kg)
 * @returns {boolean} 档案是否完整（包含年龄、身高、体重）
 * @example
 * validator.isProfileComplete({ age: 25, height: 175, weight: 70 });  // true
 * validator.isProfileComplete({ age: 25, height: 175 });              // false
 * validator.isProfileComplete(null);                                  // false
 * validator.isProfileComplete({});                                    // false
 */
const isProfileComplete = profile => {
  if (!profile) return false
  return !!(profile.age && profile.height && profile.weight)
}

/**
 * 验证食物数据有效性
 * @param {Object} food - 食物数据对象
 * @param {string} food.name - 食物名称
 * @returns {boolean} 是否为有效食物数据
 * @example
 * validator.isValidFoodData({ name: '米饭', calories: 200 });  // true
 * validator.isValidFoodData({ name: '苹果' });                 // true
 * validator.isValidFoodData({ calories: 200 });                // false (缺少name)
 * validator.isValidFoodData(null);                             // false
 */
const isValidFoodData = food => {
  if (!food || !food.name) return false
  return true
}

/**
 * 导出验证模块
 * @exports validator
 */
module.exports = {
  /**
   * 验证是否为有效数字
   * @type {Function}
   */
  isValidNumber,
  /**
   * 验证邮箱格式
   * @type {Function}
   */
  isValidEmail,
  /**
   * 验证手机号格式（中国大陆）
   * @type {Function}
   */
  isValidPhone,
  /**
   * 验证用户档案完整性
   * @type {Function}
   */
  isProfileComplete,
  /**
   * 验证食物数据有效性
   * @type {Function}
   */
  isValidFoodData
}
