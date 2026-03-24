const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const recordsCollection = db.collection('food_records')
const usersCollection = db.collection('users')

const ZHIPU_API_KEY = '6203eb5dbd6649a8ab6c22100b42a1df.njEya1qgXG5APJLm'
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const ZHIPU_MODEL = 'glm-4.6v-flashX'

const PROMPT_TEMPLATES = {
  foodRecognition: `你是一位专业的营养师AI助手。请分析这张食物图片，识别其中的所有食物。

请仔细观察图片，识别：
1. 所有可见的食物种类
2. 估算每种食物的分量
3. 分析烹饪方式

请以JSON格式返回结果，格式如下：
{
  "success": true,
  "foods": [
    {
      "name": "食物名称",
      "category": "分类(主食/肉类/蔬菜/水果/饮品/其他)",
      "estimatedWeight": 估算重量(克，数字),
      "confidence": 置信度(0-1),
      "nutrients": {
        "calories": 热量(kcal),
        "protein": 蛋白质(g),
        "fat": 脂肪(g),
        "carbohydrate": 碳水化合物(g)
      }
    }
  ],
  "description": "对图片中食物的简要描述",
  "mealType": "餐次(早餐/午餐/晚餐/加餐)"
}

如果无法识别图片中的食物，请返回：
{
  "success": false,
  "message": "无法识别原因说明"
}

请只返回JSON，不要有其他内容。`,

  nutritionAnalysis: `你是一位专业的营养师AI助手。请根据以下食物信息，分析其营养成分。

食物信息：
{foodInfo}

用户信息：
{userInfo}

请以JSON格式返回结果，格式如下：
{
  "calories": 热量(kcal，数字),
  "protein": 蛋白质(g，数字),
  "fat": 脂肪(g，数字),
  "carbohydrate": 碳水化合物(g，数字),
  "fiber": 膳食纤维(g，数字，可选),
  "vitamins": {
    "vitaminC": 维生素C(mg，数字，可选),
    "vitaminA": 维生素A(μg，数字，可选)
  },
  "minerals": {
    "calcium": 钙(mg，数字，可选),
    "iron": 铁(mg，数字，可选),
    "sodium": 钠(mg，数字，可选)
  },
  "analysisNotes": "营养分析说明"
}

请只返回JSON，不要有其他内容。`,

  recommendation: `你是一位专业的营养师AI助手。请根据用户的饮食记录和营养缺口，提供个性化建议。

用户信息：
{userInfo}

今日饮食记录：
{todayRecords}

营养缺口分析：
{nutrientGaps}

请提供以下建议（JSON格式）：
{
  "dietSuggestions": [
    {
      "type": "建议类型(补充/减少/调整)",
      "nutrient": "相关营养素",
      "foods": ["推荐食物列表"],
      "reason": "建议原因"
    }
  ],
  "lifestyleSuggestions": [
    {
      "type": "建议类型(运动/饮水/作息)",
      "content": "具体建议内容",
      "reason": "建议原因"
    }
  ],
  "encouragement": "鼓励性话语"
}

请只返回JSON，不要有其他内容。`,

  chat: `你是一位友好、专业的AI营养师助手。你的职责是：
1. 帮助用户记录和分析饮食
2. 提供营养健康方面的建议
3. 解答用户关于饮食健康的问题
4. 给予用户鼓励和支持

对话历史：
{conversationHistory}

用户档案：
{userProfile}

请用温暖、专业的语气回复用户的消息。回复要简洁明了，避免过长。
如果用户询问需要查看图片的内容，请提示用户发送图片。
如果用户的问题超出营养健康范围，请礼貌地引导回正题。

请直接回复，不需要JSON格式。`
}

async function callZhipuAI(messages, stream = false) {
  try {
    const response = await axios({
      method: 'POST',
      url: ZHIPU_API_URL,
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: ZHIPU_MODEL,
        messages: messages,
        stream: stream
      },
      timeout: 60000
    })
    
    return response.data
  } catch (error) {
    console.error('ZhipuAI API Error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || error.message || 'AI服务调用失败')
  }
}

async function callZhipuAIWithImage(imageUrl, prompt) {
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
  
  return await callZhipuAI(messages)
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

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    let result
    
    switch (action) {
      case 'foodRecognition':
        result = await handleFoodRecognition(data)
        break
      case 'nutritionAnalysis':
        result = await handleNutritionAnalysis(data)
        break
      case 'recommendation':
        result = await handleRecommendation(openid, data)
        break
      case 'chat':
        result = await handleChat(openid, data)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    return {
      success: true,
      ...result
    }
  } catch (error) {
    console.error('AI Gateway Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function handleFoodRecognition(data) {
  const { imageUrl } = data
  
  if (!imageUrl) {
    return {
      success: false,
      error: '请提供食物图片'
    }
  }
  
  try {
    const response = await callZhipuAIWithImage(imageUrl, PROMPT_TEMPLATES.foodRecognition)
    
    const content = response.choices?.[0]?.message?.content
    
    if (!content) {
      throw new Error('AI未返回有效响应')
    }
    
    const result = parseJsonResponse(content)
    
    if (!result) {
      return {
        success: false,
        error: '无法解析AI响应',
        rawContent: content
      }
    }
    
    if (!result.success) {
      return {
        success: false,
        message: result.message || '无法识别食物'
      }
    }
    
    result.foods = result.foods.map(food => ({
      name: food.name || '未知食物',
      category: food.category || '其他',
      estimatedWeight: food.estimatedWeight || 100,
      confidence: food.confidence || 0.8,
      nutrients: {
        calories: food.nutrients?.calories || 0,
        protein: food.nutrients?.protein || 0,
        fat: food.nutrients?.fat || 0,
        carbohydrate: food.nutrients?.carbohydrate || 0
      }
    }))
    
    return result
    
  } catch (error) {
    console.error('Food recognition error:', error)
    return {
      success: false,
      error: error.message || '食物识别失败，请重试'
    }
  }
}

async function handleNutritionAnalysis(data) {
  const { foodInfo, userInfo } = data
  
  const prompt = PROMPT_TEMPLATES.nutritionAnalysis
    .replace('{foodInfo}', JSON.stringify(foodInfo, null, 2))
    .replace('{userInfo}', JSON.stringify(userInfo, null, 2))
  
  try {
    const response = await callZhipuAI([
      {
        role: 'user',
        content: prompt
      }
    ])
    
    const content = response.choices?.[0]?.message?.content
    const result = parseJsonResponse(content)
    
    if (!result) {
      return {
        nutrients: {
          calories: 0,
          protein: 0,
          fat: 0,
          carbohydrate: 0,
          analysisNotes: '营养分析失败，请重试'
        }
      }
    }
    
    return { nutrients: result }
    
  } catch (error) {
    console.error('Nutrition analysis error:', error)
    return {
      nutrients: {
        calories: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        analysisNotes: '营养分析失败：' + error.message
      }
    }
  }
}

async function handleRecommendation(openid, data) {
  const { gaps, preferences } = data
  
  try {
    let userProfile = {}
    try {
      const userResult = await usersCollection.where({ openid }).get()
      if (userResult.data && userResult.data.length > 0) {
        userProfile = userResult.data[0]
      }
    } catch (e) {
      console.log('Get user profile error:', e)
    }
    
    const prompt = PROMPT_TEMPLATES.recommendation
      .replace('{userInfo}', JSON.stringify(userProfile, null, 2))
      .replace('{todayRecords}', JSON.stringify(data.todayRecords || [], null, 2))
      .replace('{nutrientGaps}', JSON.stringify(gaps, null, 2))
    
    const response = await callZhipuAI([
      {
        role: 'user',
        content: prompt
      }
    ])
    
    const content = response.choices?.[0]?.message?.content
    const result = parseJsonResponse(content)
    
    if (!result) {
      return {
        suggestions: [
          {
            type: '补充',
            nutrient: '均衡饮食',
            foods: ['蔬菜', '水果', '优质蛋白'],
            reason: '建议保持均衡饮食'
          }
        ],
        encouragement: '继续保持健康的饮食习惯！'
      }
    }
    
    return result
    
  } catch (error) {
    console.error('Recommendation error:', error)
    return {
      suggestions: [],
      encouragement: '继续保持健康的饮食习惯！'
    }
  }
}

async function handleChat(openid, data) {
  const { message, context } = data
  
  try {
    let userProfile = {}
    try {
      const userResult = await usersCollection.where({ openid }).get()
      if (userResult.data && userResult.data.length > 0) {
        userProfile = userResult.data[0]
      }
    } catch (e) {
      console.log('Get user profile error:', e)
    }
    
    const conversationHistory = context?.history || []
    const historyText = conversationHistory
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n')
    
    const prompt = PROMPT_TEMPLATES.chat
      .replace('{conversationHistory}', historyText || '无历史对话')
      .replace('{userProfile}', JSON.stringify(userProfile, null, 2))
    
    const messages = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: message
      }
    ]
    
    const response = await callZhipuAI(messages)
    const reply = response.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。'
    
    return { reply }
    
  } catch (error) {
    console.error('Chat error:', error)
    return {
      reply: '抱歉，服务暂时不可用，请稍后再试。'
    }
  }
}
