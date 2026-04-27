/**
 * @fileoverview 格式化工具模块
 * @description 提供数字、日期、时间、卡路里等数据的格式化功能
 * @module utils/formatter
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const { formatDate, formatNumber, formatCalories, formatRelativeTime } = require('./formatter');
 *
 * // 格式化日期
 * const dateStr = formatDate(new Date()); // "2024-01-15"
 *
 * // 格式化数字
 * const numStr = formatNumber(1234.5678, 2); // "1,234.57"
 *
 * // 格式化卡路里
 * const calStr = formatCalories(450); // "450 千卡"
 *
 * // 格式化相对时间
 * const timeStr = formatRelativeTime(Date.now() - 3600000); // "1小时前"
 */

/**
 * 格式化数字，添加千分位分隔符并保留指定小数位
 * @param {number} num - 要格式化的数字
 * @param {number} [decimals=0] - 保留的小数位数
 * @returns {string} 格式化后的数字字符串
 * @example
 * formatNumber(1234567.89, 2) // "1,234,567.89"
 * formatNumber(1000) // "1,000"
 */
const formatNumber = (num, decimals = 0) => {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0'
  }
  const fixed = num.toFixed(decimals)
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 格式化后的日期字符串，格式为 YYYY-MM-DD
 * @example
 * formatDate(new Date()) // "2024-01-15"
 * formatDate('2024-01-15T10:30:00') // "2024-01-15"
 * formatDate(1705312345678) // "2024-01-15"
 */
const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) {
    return ''
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化相对时间（多久之前）
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 相对时间描述
 * @example
 * formatRelativeTime(Date.now() - 60000) // "刚刚"
 * formatRelativeTime(Date.now() - 3600000) // "1小时前"
 * formatRelativeTime(Date.now() - 86400000) // "昨天"
 */
const formatRelativeTime = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < week) {
    const days = Math.floor(diff / day)
    return days === 1 ? '昨天' : `${days}天前`
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`
  } else {
    return `${Math.floor(diff / year)}年前`
  }
}

/**
 * 格式化卡路里数值，添加单位
 * @param {number} calories - 卡路里数值
 * @param {boolean} [withUnit=true] - 是否包含单位
 * @returns {string} 格式化后的卡路里字符串
 * @example
 * formatCalories(450) // "450 千卡"
 * formatCalories(450, false) // "450"
 */
const formatCalories = (calories, withUnit = true) => {
  const num = formatNumber(Math.round(calories))
  return withUnit ? `${num} 千卡` : num
}

module.exports = {
  formatNumber,
  formatDate,
  formatRelativeTime,
  formatCalories
}
