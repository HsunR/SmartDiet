/**
 * @fileoverview 通用辅助函数模块
 * @description 提供ID生成、图片处理、云存储操作、餐次判断等核心工具函数
 * @module utils/helper
 */

const { formatDate } = require('./formatter')

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符，格式为 id_<时间戳>_<随机字符串>
 */
const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 压缩图片
 * @param {string} tempFilePath - 临时文件路径
 * @param {number} [quality=80] - 压缩质量，范围1-100
 * @returns {Promise<string>} 压缩后的临时文件路径
 */
const compressImage = (tempFilePath, quality = 80) => {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: tempFilePath,
      quality,
      success: res => resolve(res.tempFilePath),
      fail: err => reject(err)
    })
  })
}



/**
 * 根据当前时间获取对应的餐次类型
 * @returns {string} 餐次类型 ('breakfast' | 'lunch' | 'dinner' | 'snack')
 */
const getCurrentMealType = () => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 17 && hour < 20) return 'dinner'
  return 'snack'
}

/**
 * 获取餐次类型的中文标签
 * @param {string} type - 餐次类型
 * @returns {string} 中文标签
 */
const getMealTypeLabel = type => {
  const labels = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '其他'
  }
  return labels[type] || '其他'
}

module.exports = {
  generateId,
  formatDate,
  compressImage,
  getCurrentMealType,
  getMealTypeLabel
}
