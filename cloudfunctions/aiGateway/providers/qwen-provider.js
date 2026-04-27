/**
 * @fileoverview 通义千问 (Qwen) 提供商模块
 * @description 通义千问 AI 服务提供商实现，基于 Qwen3.5-4B 模型
 * @module qwen-provider
 * @version 1.0.0
 */

const BaseAIProvider = require('./base-provider')

/**
 * Qwen 配置对象
 * @constant {Object}
 * @property {string} name - 提供商名称
 * @property {string} apiUrl - API 端点 URL
 * @property {string} apiKey - API 密钥
 * @property {string} model - 模型名称
 * @property {boolean} supportsVision - 是否支持视觉识别
 * @property {boolean} supportsStream - 是否支持流式响应
 * @property {number} maxTokens - 最大生成 token 数
 * @property {number} timeout - 请求超时时间（毫秒）
 * @property {Function} headers - 生成请求头的函数
 */
const QWEN_CONFIG = {
  name: 'Qwen3.5-4B Uncensored',
  apiUrl: 'http://42.4.63.133:1234/v1/chat/completions',
  apiKey: '',
  model: 'HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS:-Aggressive-no-thinking',
  supportsVision: true,
  supportsStream: true,
  maxTokens: 4096,
  timeout: 60000,
  headers: (config) => ({
    'Content-Type': 'application/json'
  })
}

/**
 * 通义千问 AI 提供商类
 * @class QwenAIProvider
 * @extends BaseAIProvider
 * @description 基于通义千问 Qwen3.5-4B 模型的 AI 提供商实现，支持本地部署
 */
class QwenAIProvider extends BaseAIProvider {
  /**
   * 创建 QwenAIProvider 实例
   * @constructor
   * @param {Object} [config=QWEN_CONFIG] - 配置对象，默认使用 QWEN_CONFIG
   */
  constructor(config = QWEN_CONFIG) {
    super(config)
  }

  /**
   * 调用 AI 服务处理图像识别请求
   * @async
   * @override
   * @param {string} imageUrl - 图片 URL，支持 HTTP URL 或 Base64 格式
   * @param {string} prompt - 提示词
   * @param {Object} [options] - 配置选项
   * @returns {Promise<Object>} AI 服务响应数据
   * @throws {Error} 如果模型不支持视觉识别或图像转换失败则抛出错误
   * @description 重写父类方法，将 HTTP 图片 URL 自动转换为 Base64 格式
   */
  async callWithImage(imageUrl, prompt, options = {}) {
    if (!this.supportsVision) {
      throw new Error('当前模型不支持图像识别功能')
    }

    let finalImageUrl = imageUrl

    // 如果是 HTTP URL，转换为 Base64
    if (imageUrl.startsWith('http')) {
      try {
        finalImageUrl = await this.imageUrlToBase64(imageUrl)
      } catch (error) {
        console.error('Failed to convert image to base64:', error.message)
        throw new Error('图像转换失败，请确保图像 URL 有效')
      }
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: finalImageUrl }
          },
          { type: 'text', text: prompt }
        ]
      }
    ]

    return await this.callWithRetry(messages, options)
  }
}

module.exports = {
  /**
   * Qwen AI Provider 类
   * @type {Class<QwenAIProvider>}
   */
  QwenAIProvider,
  /**
   * Qwen 默认配置
   * @type {Object}
   */
  QWEN_CONFIG,
  /**
   * 创建 Qwen Provider 实例
   * @param {Object} [config] - 自定义配置，将与默认配置合并
   * @returns {QwenAIProvider} QwenAIProvider 实例
   */
  createQwenProvider: (config) => new QwenAIProvider({ ...QWEN_CONFIG, ...config })
}
