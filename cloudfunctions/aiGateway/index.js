const cloud = require('wx-server-sdk')
const { callAIWithImage, callAIWithSystem, parseJsonResponse, extractContent } = require('./ai-service')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const recordsCollection = db.collection('food_records')
const usersCollection = db.collection('users')

const PROMPT_TEMPLATES = {
  foodRecognition: `### 角色 
AI营养师。分析图像，结合用户信息({userInfo})和反馈({userFeedback})输出JSON。
必须严格遵循下方JSON结构，无Markdown标记。 


### JSON结构示例 


#1. 识别食物，不能确定的成分不要记录 
{ 
   "success": true, 
   "summary": { 
     "calories": 595, 
     "score": 65, 
     "tags": {"good": ["高蛋白"], "warn": ["高钠"]}
   }, 


   "items": [ 
     { 
       "id": "food_001", 
       "name": "宫保鸡丁", 
       "category": "种类", 
       "calories": 350, 
       "weight": {"val": 135, "conf": 0.85}, 
       "tags": {"good": ["高蛋白"], "warn": ["高钠"]}, 
       "advice": "简短建议" 
     } 
   ] 
 } 
 错误返回：{"success": false, "message": "原因"}`,

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
    
    if (result.items && Array.isArray(result.items)) {
      result.foods = result.items.map(item => {
        const itemTags = item.tags || {}
        return {
          id: item.id || `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: item.name || '未知食物',
          category: item.category || '其他',
          totalCalories: item.calories || 0,
          estimatedWeight: item.weight?.val || 100,
          confidence: item.weight?.conf || 0.8,
          portionEstimation: {
            estimatedWeight: item.weight?.val || 100,
            confidence: item.weight?.conf || 0.8
          },
          tags: {
            positive: itemTags.good || [],
            warning: itemTags.warn || []
          },
          advice: item.advice || ''
        }
      })
    }
    
    if (result.summary) {
      const tags = result.summary.tags || {}
      const foodNames = (result.items || result.foods || []).map(f => f.name).filter(Boolean)
      const summaryText = foodNames.length > 0 
        ? `识别到：${foodNames.join('、')}` 
        : '识别成功'
      result.mealOverview = {
        totalCalories: result.summary.calories || 0,
        overallHealthScore: result.summary.score || 60,
        healthTags: {
          positive: tags.good || [],
          warning: tags.warn || []
        },
        summary: summaryText
      }
    } else if (result.foods) {
      const foodNames = result.foods.map(f => f.name).filter(Boolean)
      const summaryText = foodNames.length > 0 
        ? `识别到：${foodNames.join('、')}` 
        : '识别成功'
      result.mealOverview = {
        totalCalories: result.foods.reduce((sum, f) => sum + (f.totalCalories || 0), 0),
        overallHealthScore: 60,
        healthTags: { positive: [], warning: [] },
        summary: summaryText
      }
    }
    
    const advices = (result.foods || []).map(f => f.advice).filter(Boolean)
    if (advices.length > 0) {
      result.dietaryAdvice = advices.join('；')
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
