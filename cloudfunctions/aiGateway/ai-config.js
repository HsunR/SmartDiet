/**
 * @fileoverview AI 配置管理模块
 * @description 管理多个 AI 提供商的配置和切换逻辑，支持智谱 AI、通义千问和阿里云百炼等多种模型
 * @module ai-config
 * @version 1.0.0
 */

const { createZhipuProvider, createQwenProvider, createDashScopeProvider, ZHIPU_CONFIG, QWEN_CONFIG, DASHSCOPE_CONFIG } = require('./providers')

/**
 * AI 提供商实例映射表
 * @constant {Object}
 * @property {Object} zhipu - 智谱 AI 提供商实例
 * @property {Object} qwen - 通义千问提供商实例
 * @property {Object} dashscope - 阿里云百炼提供商实例
 */
const PROVIDERS = {
  zhipu: createZhipuProvider(),
  qwen: createQwenProvider(),
  dashscope: createDashScopeProvider()
}

/**
 * AI 模型配置映射表
 * @constant {Object}
 * @property {Object} zhipu - 智谱 AI 配置
 * @property {Object} qwen - 通义千问配置
 * @property {Object} dashscope - 阿里云百炼配置
 */
const AI_MODELS = {
  zhipu: ZHIPU_CONFIG,
  qwen: QWEN_CONFIG,
  dashscope: DASHSCOPE_CONFIG
}

/**
 * 当前使用的模型标识
 * @type {string}
 */
let CURRENT_MODEL = 'dashscope'

/**
 * 获取当前默认提供商实例
 * @returns {Object} AI 提供商实例
 */
function getCurrentProvider() {
  return PROVIDERS[CURRENT_MODEL]
}

/**
 * 获取指定模型的提供商实例
 * @param {string} modelKey - 模型标识（'zhipu' | 'qwen' | 'dashscope'）
 * @returns {Object} AI 提供商实例，如果指定模型不存在则返回当前默认模型
 */
function getProvider(modelKey) {
  return PROVIDERS[modelKey] || PROVIDERS[CURRENT_MODEL]
}

/**
 * 获取当前默认模型的配置
 * @returns {Object} 模型配置对象
 */
function getCurrentConfig() {
  return AI_MODELS[CURRENT_MODEL]
}

/**
 * 获取指定模型的配置
 * @param {string} modelKey - 模型标识
 * @returns {Object} 模型配置对象，如果指定模型不存在则返回当前默认模型配置
 */
function getModelConfig(modelKey) {
  return AI_MODELS[modelKey] || AI_MODELS[CURRENT_MODEL]
}

/**
 * 设置当前使用的模型
 * @param {string} modelKey - 模型标识
 * @returns {boolean} 设置成功返回 true，模型不存在返回 false
 */
function setModel(modelKey) {
  if (PROVIDERS[modelKey]) {
    CURRENT_MODEL = modelKey
    return true
  }
  return false
}

/**
 * 获取所有可用模型的列表信息
 * @returns {Array<Object>} 模型信息数组，包含 key、name、model、supportsVision 等属性
 * @property {string} key - 模型标识
 * @property {string} name - 模型名称
 * @property {string} model - 模型版本
 * @property {boolean} supportsVision - 是否支持视觉识别
 */
function listModels() {
  return Object.keys(PROVIDERS).map(key => ({
    key,
    name: PROVIDERS[key].name,
    model: PROVIDERS[key].model,
    supportsVision: PROVIDERS[key].supportsVision
  }))
}

module.exports = {
  PROVIDERS,
  AI_MODELS,
  CURRENT_MODEL,
  getCurrentProvider,
  getProvider,
  getCurrentConfig,
  getModelConfig,
  setModel,
  listModels
}
