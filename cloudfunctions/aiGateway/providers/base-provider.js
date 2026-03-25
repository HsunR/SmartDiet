const axios = require('axios')

class BaseAIProvider {
  constructor(config) {
    this.config = config
  }

  get name() {
    return this.config.name
  }

  get model() {
    return this.config.model
  }

  get supportsVision() {
    return this.config.supportsVision
  }

  get supportsStream() {
    return this.config.supportsStream
  }

  getHeaders() {
    if (typeof this.config.headers === 'function') {
      return this.config.headers(this.config)
    }
    return {
      'Content-Type': 'application/json'
    }
  }

  async call(messages, options = {}) {
    const { stream = false, maxTokens = null, temperature = null } = options

    const requestBody = {
      model: this.config.model,
      messages: messages,
      stream: stream
    }

    if (maxTokens) {
      requestBody.max_tokens = maxTokens
    }
    if (temperature !== null) {
      requestBody.temperature = temperature
    }

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

  async callWithRetry(messages, options = {}, retryCount = 2) {
    let lastError = null

    for (let i = 0; i <= retryCount; i++) {
      try {
        return await this.call(messages, options)
      } catch (error) {
        lastError = error
        console.error(`${this.name} API Error (attempt ${i + 1}/${retryCount + 1}):`, error.response?.data || error.message)

        if (i < retryCount) {
          const waitTime = 2000 * (i + 1)
          console.log(`Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    const errorMessage = lastError?.response?.data?.error?.message || lastError?.message || 'AI服务调用失败'

    if (errorMessage.includes('timeout') || errorMessage.includes('exceeded')) {
      throw new Error('AI服务响应超时，请稍后重试')
    }

    throw new Error(errorMessage)
  }

  async imageUrlToBase64(imageUrl) {
    if (imageUrl.startsWith('data:image')) {
      return imageUrl
    }

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

  async callWithText(prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    return await this.callWithRetry(messages, options)
  }

  async callWithSystem(systemPrompt, userMessage, options = {}) {
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
