const { getCurrentProvider, getProvider } = require('./ai-config')

async function callAI(messages, options = {}) {
  const { modelKey = null } = options
  const provider = modelKey ? getProvider(modelKey) : getCurrentProvider()
  
  return await provider.callWithRetry(messages, options)
}

async function callAIWithImage(imageUrl, prompt, options = {}) {
  const { modelKey = null } = options
  const provider = modelKey ? getProvider(modelKey) : getCurrentProvider()
  
  return await provider.callWithImage(imageUrl, prompt, options)
}

async function callAIWithText(prompt, options = {}) {
  const { modelKey = null } = options
  const provider = modelKey ? getProvider(modelKey) : getCurrentProvider()
  
  return await provider.callWithText(prompt, options)
}

async function callAIWithSystem(systemPrompt, userMessage, options = {}) {
  const { modelKey = null } = options
  const provider = modelKey ? getProvider(modelKey) : getCurrentProvider()
  
  return await provider.callWithSystem(systemPrompt, userMessage, options)
}

function parseJsonResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return null
  } catch (error) {
    console.error('JSON parse error:', error)
    return null
  }
}

function extractContent(response) {
  return response?.choices?.[0]?.message?.content || null
}

module.exports = {
  callAI,
  callAIWithImage,
  callAIWithText,
  callAIWithSystem,
  parseJsonResponse,
  extractContent
}
