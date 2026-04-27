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

/**
 * 参数验证
 */
const validate = (params, rules) => {
  const errors = []
  
  for (const [key, rule] of Object.entries(rules)) {
    const value = params[key]
    
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.label || key}不能为空`)
    }
    
    if (value && rule.type && typeof value !== rule.type) {
      errors.push(`${rule.label || key}格式不正确`)
    }
    
    if (value && rule.validate && !rule.validate(value)) {
      errors.push(rule.errorMessage || `${rule.label || key}验证失败`)
    }
  }
  
  return errors
}

module.exports = {
  success,
  fail,
  withErrorHandling,
  validate
}
