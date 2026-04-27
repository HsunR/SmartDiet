/**
 * @fileoverview 智谱 AI (Zhipu) 提供商模块
 * @description 智谱 AI 服务提供商实现，基于智谱 GLM 模型
 * @module zhipu-provider
 * @version 1.0.0
 */

const BaseAIProvider = require('./base-provider')

/**
 * 智谱 AI 配置对象
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
const ZHIPU_CONFIG = {
  name: '智谱 AI GLM',
  apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  apiKey: '6203eb5dbd6649a8ab6c22100b42a1df.njEya1qgXG5APJLm',
  model: 'glm-4.6v-flashX',
  supportsVision: true,
  supportsStream: true,
  maxTokens: 4096,
  timeout: 50000,
  headers: (config) => ({
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json'
  })
}

/**
 * 智谱 AI 提供商类
 * @class ZhipuAIProvider
 * @extends BaseAIProvider
 * @description 基于智谱 GLM 模型的 AI 提供商实现
 */
class ZhipuAIProvider extends BaseAIProvider {
  /**
   * 创建 ZhipuAIProvider 实例
   * @constructor
   * @param {Object} [config=ZHIPU_CONFIG] - 配置对象，默认使用 ZHIPU_CONFIG
   */
  constructor(config = ZHIPU_CONFIG) {
    super(config)
  }
}

module.exports = {
  /**
   * 智谱 AI Provider 类
   * @type {Class<ZhipuAIProvider>}
   */
  ZhipuAIProvider,
  /**
   * 智谱 AI 默认配置
   * @type {Object}
   */
  ZHIPU_CONFIG,
  /**
   * 创建智谱 AI Provider 实例
   * @param {Object} [config] - 自定义配置，将与默认配置合并
   * @returns {ZhipuAIProvider} ZhipuAIProvider 实例
   */
  createZhipuProvider: (config) => new ZhipuAIProvider({ ...ZHIPU_CONFIG, ...config })
}
