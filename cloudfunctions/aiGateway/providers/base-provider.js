/**
 * @fileoverview AI 提供商基类
 * @description 定义 AI 服务调用的通用接口和基础实现，所有具体的 AI 提供商类都应继承此基类
 * @module base-provider
 * @version 1.0.0
 */

const axios = require('axios')

/**
 * AI 提供商基类
 * @class BaseAIProvider
 * @abstract
 */
class BaseAIProvider {
  /**
   * 创建 BaseAIProvider 实例
   * @constructor
   * @param {Object} config - AI 服务配置对象
   * @param {string} config.name - 提供商名称
   * @param {string} config.apiUrl - API 端点 URL
   * @param {string} config.apiKey - API 密钥
   * @param {string} config.model - 模型名称
   * @param {boolean} config.supportsVision - 是否支持视觉识别
   * @param {boolean} config.supportsStream - 是否支持流式响应
   * @param {number} config.timeout - 请求超时时间（毫秒）
   */
  constructor(config) {
    this.config = config
  }

  /**
   * 获取提供商名称
   * @type {string}
   * @readonly
   */
  get name() {
    return this.config.name
  }

  /**
   * 获取模型名称
   * @type {string}
   * @readonly
   */
  get model() {
    return this.config.model
  }

  /**
   * 获取是否支持视觉识别
   * @type {boolean}
   * @readonly
   */
  get supportsVision() {
    return this.config.supportsVision
  }

  /**
   * 获取是否支持流式响应
   * @type {boolean}
   * @readonly
   */
  get supportsStream() {
    return this.config.supportsStream
  }

  /**
   * 获取请求头配置
   * @returns {Object} 请求头对象
   */
  getHeaders() {
    if (typeof this.config.headers === 'function') {
      return this.config.headers(this.config)
    }
    return {
      'Content-Type': 'application/json'
    }
  }

  /**
   * 调用 AI 服务
   * @async
   * @param {Array<Object>} messages - 消息数组，包含 role 和 content
   * @param {Object} [options] - 配置选项
   * @param {boolean} [options.stream] - 是否使用流式响应
   * @param {number} [options.maxTokens] - 最大生成 token 数
   * @param {number} [options.temperature] - 温度参数，控制随机性
   * @returns {Promise<Object>} AI 服务响应数据
   * @throws {Error} 请求失败时抛出错误
   */
  async call(messages, options = {}) {
    const { stream = false, maxTokens = null, temperature = null } = options

    // 构建请求体
    const requestBody = {
      model: this.config.model,
      messages: messages,
      stream: stream
    }

    // 可选参数设置
    if (maxTokens) {
      requestBody.max_tokens = maxTokens
    }
    if (temperature !== null) {
      requestBody.temperature = temperature
    }

    // 发送 HTTP 请求
    const response = await axios({
      method: 'POST',
      url: this.config.apiUrl,
      headers: this.getHeaders(),
      data: requestBody,
      timeout: this.config.timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    return response.data
  }

  /**
   * 带重试机制的 AI 调用
   * 失败后自动重试，使用指数退避策略
   * @async
   * @param {Array<Object>} messages - 消息数组
   * @param {Object} [options] - 配置选项
   * @param {number} [retryCount] - 重试次数，默认 2 次
   * @returns {Promise<Object>} AI 服务响应数据
   * @throws {Error} 重试失败后抛出错误
   */
  async callWithRetry(messages, options = {}, retryCount = 2) {
    let lastError = null

    for (let i = 0; i <= retryCount; i++) {
      try {
        return await this.call(messages, options)
      } catch (error) {
        lastError = error
        console.error(`${this.name} API Error (attempt ${i + 1}/${retryCount + 1}):`, error.response?.data || error.message)

        if (i < retryCount) {
          // 指数退避：等待时间 = 2000ms * (i + 1)
          const waitTime = 2000 * (i + 1)
          console.log(`Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    // 构造错误信息
    const errorMessage = lastError?.response?.data?.error?.message || lastError?.message || 'AI 服务调用失败'

    if (errorMessage.includes('timeout') || errorMessage.includes('exceeded')) {
      throw new Error('AI 服务响应超时，请稍后重试')
    }

    throw new Error(errorMessage)
  }

  /**
   * 将图片 URL 转换为 Base64 格式
   * 用于不支持直接 URL 访问的 AI 服务
   * @async
   * @param {string} imageUrl - 图片 URL
   * @returns {Promise<string>} Base64 格式的图片数据（data:image/...;base64,...）
   * @throws {Error} 转换失败时抛出错误
   */
  async imageUrlToBase64(imageUrl) {
    // 如果已经是 base64 格式，直接返回
    if (imageUrl.startsWith('data:image')) {
      return imageUrl
    }

    // 下载图片并转换为 base64
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    })

    const contentType = response.headers['content-type'] || 'image/jpeg'
    const base64 = Buffer.from(response.data, 'binary').toString('base64')

    return `data:${contentType};base64,${base64}`
  }

  /**
   * 调用 AI 服务处理图像识别
   * @async
   * @param {string} imageUrl - 图片 URL
   * @param {string} prompt - 提示词
   * @param {Object} [options] - 配置选项
   * @returns {Promise<Object>} AI 服务响应数据
   * @throws {Error} 如果模型不支持视觉识别则抛出错误
   */
  async callWithImage(imageUrl, prompt, options = {}) {
    if (!this.supportsVision) {
      throw new Error('当前模型不支持图像识别功能')
    }

    // 构建包含图像和文本的消息
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]

    return await this.callWithRetry(messages, options)
  }

  /**
   * 调用 AI 服务处理纯文本请求
   * @async
   * @param {string} prompt - 提示词
   * @param {Object} [options] - 配置选项
   * @returns {Promise<Object>} AI 服务响应数据
   * @throws {Error} 请求失败时抛出错误
   */
  async callWithText(prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    return await this.callWithRetry(messages, options)
  }

  /**
   * 调用 AI 服务处理带系统提示词的对话
   * @async
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userMessage - 用户消息
   * @param {Object} [options] - 配置选项
   * @returns {Promise<Object>} AI 服务响应数据
   * @throws {Error} 请求失败时抛出错误
   */
  async callWithSystem(systemPrompt, userMessage, options = {}) {
    // 构建包含系统消息和用户消息的对话
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ]

    return await this.callWithRetry(messages, options)
  }
}

module.exports = BaseAIProvider
