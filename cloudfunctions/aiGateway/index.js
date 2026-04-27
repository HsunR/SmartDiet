/**
 * @fileoverview AI 网关云函数主入口
 * @description 处理食物识别和智能对话请求，整合用户信息和饮食记录，调用 AI 服务进行分析
 * @module aiGateway
 * @version 1.0.0
 * @author SmartDiet Team
 */

const cloud = require('wx-server-sdk')
const { success, fail, withErrorHandling } = require('./response')
const { callAIWithImage, callAIWithSystem, parseJsonResponse, extractContent } = require('./ai-service')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * AI 提示词模板
 * @constant {Object}
 * @property {string} foodRecognition - 食物识别提示词模板
 * @property {string} chat - 智能对话提示词模板
 */
const PROMPT_TEMPLATES = {
  foodRecognition: `### 角色
AI 营养师。分析图像，结合用户信息 ({userInfo}) 和反馈 ({userFeedback}) 输出 JSON。
必须严格遵循下方 JSON 结构，无 Markdown 标记。


### JSON 结构示例


#1. 识别食物，不能确定的成分不要记录
#2. 每个 tag 必须附带 tagReasons，说明 AI 打下这个标签的原因（一句话解释）
{
   "success": true,
   "summary": {
     "score": 65,
     "tags": {"good": ["高蛋白"], "warn": ["高钠"]},
     "tagReasons": {"高蛋白": "鸡肉富含优质蛋白质", "高钠": "酱油和腌制调料含盐量高"}
   },


   "items": [
     {
       "id": "food_001",
       "name": "宫保鸡丁",
       "category": "种类",
       "score": 75,
       "weight": {"val": 135, "conf": 0.85},
       "tags": {"good": ["高蛋白"], "warn": ["高钠"]},
       "tagReasons": {"高蛋白": "鸡肉富含优质蛋白质", "高钠": "酱油和腌制调料含盐量高"},
       "advice": "简短建议"
     }
   ]
 }
 错误返回：{"success": false, "message": "原因"}`,

  chat: `你是 AI 营养师助手。帮助用户记录饮食、提供建议、解答问题。

用户信息：{userProfile}
最近饮食：{recentDiet}
对话历史：{conversationHistory}

用温暖专业的语气回复，简洁明了。直接回复，不需要 JSON 格式。`
}

/**
 * 获取用户档案信息
 * @async
 * @param {string} openid - 用户微信 OpenID
 * @returns {Promise<Object>} 用户档案数据，获取失败返回空对象
 */
const getUserProfile = async openid => {
  try {
    const userResult = await db.collection('users').where({ openid }).get()
    return userResult.data?.[0] || {}
  } catch (e) {
    console.error('Get user profile error:', e)
    return {}
  }
}

/**
 * 获取用户最近 3 天的饮食记录
 * @async
 * @param {string} openid - 用户微信 OpenID
 * @returns {Promise<Object>} 包含餐次数量、平均卡路里和最近食物列表的对象
 * @property {number} mealCount - 近 3 天餐次数量
 * @property {string[]} recentFoods - 最近食用的食物名称列表
 */
const getRecentDiet = async openid => {
  try {
    const today = new Date()
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const result = await db.collection('food_records')
      .where({
        openid,
        date: _.gte(formatDate(threeDaysAgo))
      })
      .orderBy('date', 'desc')
      .limit(10)
      .field({ foods: true, mealOverview: true })
      .get()
    
    if (result.data?.length > 0) {
      const recentFoods = []
      result.data.slice(0, 3).forEach(record => {
        (record.foods || []).forEach(food => {
          if (recentFoods.length < 8) recentFoods.push(food.name)
        })
      })
      
      return {
        mealCount: result.data.length,
        recentFoods: [...new Set(recentFoods)].slice(0, 4)
      }
    }
  } catch (e) {
    console.error('Get recent diet error:', e)
  }
  return {}
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 处理食物识别请求
 * @async
 * @param {string} openid - 用户微信 OpenID
 * @param {Object} data - 请求数据
 * @param {string} data.imageUrl - 食物图片 URL
 * @param {string} [data.userFeedback] - 用户反馈信息
 * @returns {Promise<Object>} 识别结果响应
 * @property {boolean} success - 是否识别成功
 * @property {Object} data - 识别结果数据
 * @property {Object[]} data.foods - 识别到的食物列表
 * @property {Object} data.mealOverview - 餐食概览信息
 * @property {string} data.dietaryAdvice - 饮食建议
 */
const handleFoodRecognition = async (openid, data) => {
  const { imageUrl, userFeedback } = data
  
  if (!imageUrl) {
    return fail('请提供食物图片')
  }
  
  try {
    const userProfile = await getUserProfile(openid)
    
    const prompt = PROMPT_TEMPLATES.foodRecognition
      .replace('{userInfo}', JSON.stringify(userProfile, null, 2))
      .replace('{userFeedback}', userFeedback || '无')
    
    const response = await callAIWithImage(imageUrl, prompt)
    const content = extractContent(response)
    
    if (!content) {
      return fail('AI 未返回有效响应')
    }
    
    const result = parseJsonResponse(content)
    
    if (!result) {
      return fail('无法解析 AI 响应', -1, { rawContent: content })
    }
    
    if (!result.success) {
      return fail(result.message || '无法识别食物')
    }
    
    if (result.items?.length > 0) {
      result.foods = result.items.map(item => ({
        id: item.id || `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.name || '未知食物',
        category: item.category || '其他',
        score: item.score || 60,
        estimatedWeight: item.weight?.val || 100,
        confidence: item.weight?.conf || 0.8,
        portionEstimation: {
          estimatedWeight: item.weight?.val || 100,
          confidence: item.weight?.conf || 0.8
        },
        tags: {
          positive: item.tags?.good || [],
          warning: item.tags?.warn || []
        },
        tagReasons: item.tagReasons || {},
        advice: item.advice || ''
      }))
    }

    if (result.summary) {
      const tags = result.summary.tags || {}
      const tagReasons = result.summary.tagReasons || {}
      const foodNames = (result.items || result.foods || []).map(f => f.name).filter(Boolean)
      result.mealOverview = {
        overallHealthScore: result.summary.score || 60,
        healthTags: { positive: tags.good || [], warning: tags.warn || [] },
        tagReasons: tagReasons,
        summary: foodNames.length > 0 ? `识别到：${foodNames.join('、')}` : '识别成功'
      }
    } else if (result.foods?.length > 0) {
      const foodNames = result.foods.map(f => f.name).filter(Boolean)
      const avgScore = Math.round(result.foods.reduce((sum, f) => sum + (f.score || 60), 0) / result.foods.length)
      result.mealOverview = {
        overallHealthScore: avgScore,
        healthTags: { positive: [], warning: [] },
        tagReasons: {},
        summary: foodNames.length > 0 ? `识别到：${foodNames.join('、')}` : '识别成功'
      }
    }
    
    const advices = (result.foods || []).map(f => f.advice).filter(Boolean)
    if (advices.length > 0) {
      result.dietaryAdvice = advices.join(';')
    }
    
    return success(result)
  } catch (error) {
    console.error('Food recognition error:', error)
    return fail(error.message || '食物识别失败，请重试')
  }
}

/**
 * 处理智能对话请求
 * @async
 * @param {string} openid - 用户微信 OpenID
 * @param {Object} data - 请求数据
 * @param {string} data.message - 用户消息内容
 * @param {Object} [data.context] - 对话上下文
 * @param {Object[]} [data.context.messages] - 历史消息列表
 * @returns {Promise<Object>} 对话响应
 * @property {boolean} success - 是否成功
 * @property {Object} data - 响应数据
 * @property {string} data.reply - AI 回复内容
 */
const handleChat = async (openid, data) => {
  const { message, context } = data
  
  try {
    const userProfile = await getUserProfile(openid)
    const recentDiet = await getRecentDiet(openid)
    
    const prompt = PROMPT_TEMPLATES.chat
      .replace('{userProfile}', JSON.stringify(userProfile, null, 2))
      .replace('{recentDiet}', JSON.stringify(recentDiet, null, 2))
      .replace('{conversationHistory}', JSON.stringify(context?.messages?.slice(-10) || [], null, 2))
    
    const response = await callAIWithSystem(prompt, message)
    const content = extractContent(response)
    
    return success({ reply: content || '抱歉，我暂时无法回复，请稍后再试。' })
  } catch (error) {
    console.error('Chat error:', error)
    return fail('网络异常，请稍后再试')
  }
}

/**
 * 云函数主入口
 * @async
 * @param {Object} event - 云函数调用事件对象
 * @param {string} event.action - 操作类型：'foodRecognition' | 'chat'
 * @param {Object} event.data - 请求数据
 * @returns {Promise<Object>} 响应结果
 */
exports.main = withErrorHandling(async event => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  switch (action) {
    case 'foodRecognition':
      return await handleFoodRecognition(openid, data)
    case 'chat':
      return await handleChat(openid, data)
    default:
      return fail(`未知操作: ${action}`)
  }
})
