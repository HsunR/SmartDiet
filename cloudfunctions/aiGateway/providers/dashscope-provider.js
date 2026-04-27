/**
 * @fileoverview 阿里云百炼 (DashScope) 提供商模块
 * @description 阿里云百炼 OpenAI 兼容模式提供商实现，基于 qwen3.5-flash 模型
 * @module dashscope-provider
 * @version 1.0.0
 */

const BaseAIProvider = require('./base-provider')

/**
 * DashScope 配置对象
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
const DASHSCOPE_CONFIG = {
  name: '阿里云百炼 DashScope',
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  apiKey: 'sk-1fe962dd1db4476484918623c088798b',
  model: 'qwen3.5-flash',
  supportsVision: true,
  supportsStream: true,
  maxTokens: 4096,
  timeout: 60000,
  headers: (config) => ({
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json'
  })
}

/**
 * 阿里云百炼 AI 提供商类
 * @class DashScopeAIProvider
 * @extends BaseAIProvider
 * @description 基于阿里云百炼服务的 AI 提供商实现，使用 OpenAI 兼容接口
 */
class DashScopeAIProvider extends BaseAIProvider {
  /**
   * 创建 DashScopeAIProvider 实例
   * @constructor
   * @param {Object} [config=DASHSCOPE_CONFIG] - 配置对象，默认使用 DASHSCOPE_CONFIG
   */
  constructor(config = DASHSCOPE_CONFIG) {
    super(config)
  }
}

module.exports = {
  /**
   * DashScope AI Provider 类
   * @type {Class<DashScopeAIProvider>}
   */
  DashScopeAIProvider,
  /**
   * DashScope 默认配置
   * @type {Object}
   */
  DASHSCOPE_CONFIG,
  /**
   * 创建 DashScope Provider 实例
   * @param {Object} [config] - 自定义配置，将与默认配置合并
   * @returns {DashScopeAIProvider} DashScopeAIProvider 实例
   */
  createDashScopeProvider: (config) => new DashScopeAIProvider({ ...DASHSCOPE_CONFIG, ...config })
}
