const { createZhipuProvider, createQwenProvider, ZHIPU_CONFIG, QWEN_CONFIG } = require('./providers')

const PROVIDERS = {
  zhipu: createZhipuProvider(),
  qwen: createQwenProvider()
}

const AI_MODELS = {
  zhipu: ZHIPU_CONFIG,
  qwen: QWEN_CONFIG
}

let CURRENT_MODEL = 'qwen'

function getCurrentProvider() {
  return PROVIDERS[CURRENT_MODEL]
}

function getProvider(modelKey) {
  return PROVIDERS[modelKey] || PROVIDERS[CURRENT_MODEL]
}

function getCurrentConfig() {
  return AI_MODELS[CURRENT_MODEL]
}

function getModelConfig(modelKey) {
  return AI_MODELS[modelKey] || AI_MODELS[CURRENT_MODEL]
}

function setModel(modelKey) {
  if (PROVIDERS[modelKey]) {
    CURRENT_MODEL = modelKey
    return true
  }
  return false
}

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
