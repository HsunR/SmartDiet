/**
 * @fileoverview AI 服务模块
 * @description 提供统一的 AI 服务调用接口，支持多模型适配和响应解析
 * @module ai-service
 * @version 1.0.0
 */

const { getCurrentProvider, getProvider } = require('./ai-config')

/**
 * 使用 AI 服务处理图像识别请求
 * @async
 * @param {string} imageUrl - 图片 URL
 * @param {string} prompt - 提示词
 * @param {Object} [options] - 配置选项
 * @param {string} [options.modelKey] - 指定使用的模型 key，不指定则使用当前默认模型
 * @returns {Promise<Object>} AI 服务响应数据
 */
async function callAIWithImage(imageUrl, prompt, options = {}) {
  const { modelKey = null } = options
  const provider = modelKey ? getProvider(modelKey) : getCurrentProvider()
  
  return await provider.callWithImage(imageUrl, prompt, options)
}

/**
 * 使用 AI 服务处理文本对话请求（带系统提示词）
 * @async
 * @param {string} systemPrompt - 系统提示词，用于设定 AI 角色和行为
 * @param {string} userMessage - 用户消息
 * @param {Object} [options] - 配置选项
 * @param {string} [options.modelKey] - 指定使用的模型 key
 * @returns {Promise<Object>} AI 服务响应数据
 */
async function callAIWithSystem(systemPrompt, userMessage, options = {}) {
  const { modelKey = null } = options
  const provider = modelKey ? getProvider(modelKey) : getCurrentProvider()
  
  return await provider.callWithSystem(systemPrompt, userMessage, options)
}

/**
 * 解析 AI 返回的 JSON 格式响应
 * 处理可能的格式问题，如注释、多余逗号等
 * @param {string} content - AI 返回的原始内容
 * @returns {Object|null} 解析后的对象，解析失败返回 null
 */
function parseJsonResponse(content) {
  try {
    let jsonStr = content.trim()
    
    // 移除注释
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    
    // 修复 JSON 格式问题：移除末尾多余的逗号
    jsonStr = jsonStr.replace(/,\s*}/g, '}')
    jsonStr = jsonStr.replace(/,\s*]/g, ']')
    
    // 提取 JSON 对象部分
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return null
  } catch (error) {
    console.error('JSON parse error:', error)
    console.error('Original content:', content)
    return null
  }
}

/**
 * 从 AI 响应中提取消息内容
 * @param {Object} response - AI 服务的完整响应
 * @returns {string|null} 提取的内容，如果提取失败返回 null
 */
function extractContent(response) {
  return response?.choices?.[0]?.message?.content || null
}

module.exports = {
  callAIWithImage,
  callAIWithSystem,
  parseJsonResponse,
  extractContent
}
