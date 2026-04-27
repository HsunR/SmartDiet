/**
 * @fileoverview AI 提供商模块导出
 * @description 统一导出所有 AI 提供商类和配置，作为 providers 模块的入口
 * @module providers
 * @version 1.0.0
 */

const { ZhipuAIProvider, ZHIPU_CONFIG, createZhipuProvider } = require('./zhipu-provider')
const { QwenAIProvider, QWEN_CONFIG, createQwenProvider } = require('./qwen-provider')
const { DashScopeAIProvider, DASHSCOPE_CONFIG, createDashScopeProvider } = require('./dashscope-provider')

module.exports = {
  /**
   * 智谱 AI Provider 类
   * @type {Class<ZhipuAIProvider>}
   */
  ZhipuAIProvider,
  /**
   * 通义千问 Provider 类
   * @type {Class<QwenAIProvider>}
   */
  QwenAIProvider,
  /**
   * 阿里云百炼 Provider 类
   * @type {Class<DashScopeAIProvider>}
   */
  DashScopeAIProvider,
  /**
   * 智谱 AI 配置
   * @type {Object}
   */
  ZHIPU_CONFIG,
  /**
   * 通义千问配置
   * @type {Object}
   */
  QWEN_CONFIG,
  /**
   * 阿里云百炼配置
   * @type {Object}
   */
  DASHSCOPE_CONFIG,
  /**
   * 创建智谱 AI Provider 实例
   * @type {Function}
   */
  createZhipuProvider,
  /**
   * 创建通义千问 Provider 实例
   * @type {Function}
   */
  createQwenProvider,
  /**
   * 创建阿里云百炼 Provider 实例
   * @type {Function}
   */
  createDashScopeProvider
}
