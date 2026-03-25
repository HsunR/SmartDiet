const cloud = require('wx-server-sdk')
const { callAIWithImage, callAIWithSystem, parseJsonResponse, extractContent } = require('./ai-service')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const recordsCollection = db.collection('food_records')
const usersCollection = db.collection('users')

const PROMPT_TEMPLATES = {
  foodRecognition: `# Role
你是AI营养师助手，分析食物图像并提供营养评估。

用户信息：{userInfo}
用户对上一次识别的反馈：{userFeedback}

# Task
1. 识别图中所有食物成分
2. 推断烹饪方式（清蒸、红烧、油炸、爆炒、凉拌等）
3. 估算每种食物重量（克）和置信度
4. 计算营养数值：热量(kcal)、蛋白质(g)、脂肪(g)、碳水(g)、纤维(g)、糖(g)、钠(mg)

# Output Format
仅返回JSON，无markdown标记：
{
  "success": true,
  "mealOverview": {
    "mealType": "午餐",
    "totalCalories": 595,
    "overallHealthScore": 65,
    "healthTags": {"positive": ["高蛋白"], "warning": ["高钠"]},
    "summary": "简短描述"
  },
  "foods": [
    {
      "id": "food_001",
      "name": "宫保鸡丁",
      "category": "肉类",
      "ingredientsDetected": ["鸡肉", "花生"],
      "cookingMethod": {"technique": "爆炒", "oilLevel": "high"},
      "portionEstimation": {"estimatedWeight": 135, "confidence": 0.85},
      "nutrientsEstimation": {"calories": 240, "protein": 18.5, "fat": 14.0, "carbohydrate": 8.0, "fiber": 1.2, "sugar": 4.5, "sodium": 480}
    }
  ],
  "dietaryAdvice": "简短建议"
}

错误时返回：{"success": false, "message": "原因"}`,

  chat: `你是AI营养师助手。帮助用户记录饮食、提供建议、解答问题。

用户信息：{userProfile}
最近饮食：{recentDiet}
对话历史：{conversationHistory}

用温暖专业的语气回复，简洁明了。直接回复，不需要JSON格式。`
}

async function getUserProfile(openid) {
  try {
    const userResult = await usersCollection.where({ openid }).get()
    if (userResult.data && userResult.data.length > 0) {
      return userResult.data[0]
    }
  } catch (e) {
    console.log('Get user profile error:', e)
  }
  return {}
}

async function getRecentDiet(openid) {
  try {
    const today = new Date()
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const result = await recordsCollection
      .where({
        openid,
        date: _.gte(formatDate(threeDaysAgo))
      })
      .orderBy('date', 'desc')
      .limit(10)
      .field({
        totalCalories: true,
        foods: true
      })
      .get()
    
    if (result.data && result.data.length > 0) {
      const totalCalories = result.data.reduce((sum, r) => sum + (r.totalCalories || 0), 0)
      const avgCalories = Math.round(totalCalories / result.data.length)
      const mealCount = result.data.length
      
      const recentFoods = []
      result.data.slice(0, 3).forEach(record => {
        (record.foods || []).forEach(food => {
          if (recentFoods.length < 8) {
            recentFoods.push(food.name)
          }
        })
      })
      
      return {
        mealCount,
        avgCalories,
        recentFoods: [...new Set(recentFoods)].slice(0, 4)
      }
    }
  } catch (e) {
    console.log('Get recent diet error:', e)
  }
  return {}
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    let result
    
    switch (action) {
      case 'foodRecognition':
        result = await handleFoodRecognition(openid, data)
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

async function handleFoodRecognition(openid, data) {
  const { imageUrl, userFeedback } = data
  
  if (!imageUrl) {
    return {
      success: false,
      error: '请提供食物图片'
    }
  }
  
  try {
    const userProfile = await getUserProfile(openid)
    
    let prompt = PROMPT_TEMPLATES.foodRecognition
      .replace('{userInfo}', JSON.stringify(userProfile, null, 2))
      .replace('{userFeedback}', userFeedback || '无')
    
    const response = await callAIWithImage(imageUrl, prompt)
    
    const content = extractContent(response)
    
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
    
    if (result.foods) {
      result.foods = result.foods.map(food => ({
        id: food.id || `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: food.name || '未知食物',
        category: food.category || '其他',
        ingredientsDetected: food.ingredientsDetected || [],
        cookingMethod: food.cookingMethod || {},
        portionEstimation: food.portionEstimation || { estimatedWeight: 100 },
        nutrientsEstimation: food.nutrientsEstimation || {},
        estimatedWeight: food.portionEstimation?.estimatedWeight || 100,
        confidence: food.portionEstimation?.confidence || 0.8,
        nutrients: {
          calories: food.nutrientsEstimation?.calories || 0,
          protein: food.nutrientsEstimation?.protein || 0,
          fat: food.nutrientsEstimation?.fat || 0,
          carbohydrate: food.nutrientsEstimation?.carbohydrate || 0,
          fiber: food.nutrientsEstimation?.fiber || 0,
          sugar: food.nutrientsEstimation?.sugar || 0,
          sodium: food.nutrientsEstimation?.sodium || 0,
          saturatedFat: food.nutrientsEstimation?.saturatedFat || 0,
          addedOilEstimate: food.nutrientsEstimation?.addedOilEstimate || 0
        }
      }))
    }
    
    if (result.mealOverview) {
      result.mealOverview.totalCalories = result.mealOverview.totalCalories || 
        (result.foods || []).reduce((sum, f) => sum + (f.nutrients?.calories || 0), 0)
    }
    
    return result
    
  } catch (error) {
    console.error('Food recognition error:', error)
    return {
      success: false,
      error: error.message || '食物识别失败，请重试'
    }
  }
}

async function handleChat(openid, data) {
  const { message, context } = data
  
  try {
    const userProfile = await getUserProfile(openid)
    const recentDiet = await getRecentDiet(openid)
    
    let prompt = PROMPT_TEMPLATES.chat
      .replace('{userProfile}', JSON.stringify(userProfile, null, 2))
      .replace('{recentDiet}', JSON.stringify(recentDiet, null, 2))
      .replace('{conversationHistory}', JSON.stringify(context?.messages?.slice(-10) || [], null, 2))
    
    const response = await callAIWithSystem(prompt, message)
    
    const content = extractContent(response)
    
    return {
      reply: content || '抱歉，我暂时无法回复，请稍后再试。'
    }
    
  } catch (error) {
    console.error('Chat error:', error)
    return {
      reply: '抱歉，网络出现问题，请稍后再试。'
    }
  }
}
