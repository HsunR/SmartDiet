const BaseAIProvider = require('./base-provider')

const ZHIPU_CONFIG = {
  name: '智谱AI GLM',
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

class ZhipuAIProvider extends BaseAIProvider {
  constructor(config = ZHIPU_CONFIG) {
    super(config)
  }

  async callWithImage(imageUrl, prompt, options = {}) {
    if (!this.supportsVision) {
      throw new Error('当前模型不支持图像识别功能')
    }

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
}

module.exports = {
  ZhipuAIProvider,
  ZHIPU_CONFIG,
  createZhipuProvider: (config) => new ZhipuAIProvider({ ...ZHIPU_CONFIG, ...config })
}
