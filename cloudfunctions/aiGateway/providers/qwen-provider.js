const BaseAIProvider = require('./base-provider')

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

class QwenAIProvider extends BaseAIProvider {
  constructor(config = QWEN_CONFIG) {
    super(config)
  }

  async callWithImage(imageUrl, prompt, options = {}) {
    if (!this.supportsVision) {
      throw new Error('当前模型不支持图像识别功能')
    }

    let finalImageUrl = imageUrl

    if (imageUrl.startsWith('http')) {
      try {
        finalImageUrl = await this.imageUrlToBase64(imageUrl)
      } catch (error) {
        console.error('Failed to convert image to base64:', error.message)
        throw new Error('图像转换失败，请确保图像URL有效')
      }
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: finalImageUrl
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
  QwenAIProvider,
  QWEN_CONFIG,
  createQwenProvider: (config) => new QwenAIProvider({ ...QWEN_CONFIG, ...config })
}
