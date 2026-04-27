/**
 * 统一响应格式
 */
const success = (data = null, message = 'success') => ({
  success: true,
  data,
  message
})

const fail = (error = '操作失败', code = -1, data = null) => ({
  success: false,
  error,
  code,
  data
})

/**
 * 统一错误处理包装器
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
