/**
 * @fileoverview 统一响应处理模块
 * @description 提供标准化的成功/失败响应格式和错误处理包装器
 * @module response
 * @version 1.0.0
 */

/**
 * 生成成功响应对象
 * @param {*} [data=null] - 响应数据
 * @param {string} [message='success'] - 成功消息
 * @returns {Object} 成功响应对象
 * @property {boolean} success - 是否成功（始终为 true）
 * @property {*} data - 响应数据
 * @property {string} message - 成功消息
 */
const success = (data = null, message = 'success') => ({
  success: true,
  data,
  message
})

/**
 * 生成失败响应对象
 * @param {string} [error='操作失败'] - 错误信息
 * @param {number} [code=-1] - 错误代码
 * @param {*} [data=null] - 附加错误数据
 * @returns {Object} 失败响应对象
 * @property {boolean} success - 是否成功（始终为 false）
 * @property {string} error - 错误信息
 * @property {number} code - 错误代码
 * @property {*} data - 附加错误数据
 */
const fail = (error = '操作失败', code = -1, data = null) => ({
  success: false,
  error,
  code,
  data
})

/**
 * 统一错误处理包装器
 * 包装云函数处理器，自动捕获并处理异常
 * @param {Function} handler - 云函数处理器函数
 * @returns {Function} 包装后的处理器函数
 */
const withErrorHandling = handler => async (event, context) => {
  try {
    const result = await handler(event, context)
    return result
  } catch (error) {
    console.error('Cloud Function Error:', error)
    return fail(error.message || '服务器内部错误', -1)
  }
}

module.exports = {
  success,
  fail,
  withErrorHandling
}
