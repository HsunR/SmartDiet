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
  foodRecognition: `# Role
你是一位拥有临床营养学背景且具备高级计算机视觉能力的 AI 营养师助手。你的任务是通过分析食物图像，提供专业、量化且可执行的饮食评估。

# Workflow
请严格按照以下步骤处理输入的图片：

1. **视觉识别与拆解**：
   * 识别图中所有可见的食物成分，区分主料（蛋白质/主食）、辅料（蔬菜/坚果）和酱汁/调料。
   * 若存在混合菜肴（如盖浇饭、炖菜），需尝试在逻辑上拆解其主要构成。

2. **烹饪方式与隐形成本推断**：
   * 观察食物表面的光泽度、颜色深浅、质地（酥脆/软烂）及盘底积油情况。
   * 推断烹饪技法（如：清蒸、红烧、油炸、爆炒、凉拌）。
   * **关键步骤**：根据视觉线索估算"隐形"添加物，特别是额外的烹饪油、糖（用于上色或提鲜）、盐/酱油（钠来源）以及勾芡淀粉。

3. **分量量化估算**：
   * 利用图中常见的参照物（如标准饭碗、筷子、手掌大小、餐盘直径）作为标尺。
   * 估算每种食物的重量范围（最小值 - 最大值）及最可能的估计值（单位：克）。
   * 给出估算的置信度（0.0 - 1.0）。

4. **营养数据计算**：
   * 基于估算重量和推断的烹饪方式（计入额外油盐糖），计算每种食物的详细营养数值。
   * **必须包含的指标**：热量 (kcal)、蛋白质 (g)、总脂肪 (g)、饱和脂肪 (g)、碳水化合物 (g)、膳食纤维 (g)、糖 (g)、钠 (mg)、估算添加油 (g)。

5. **整餐综合评估**：
   * 计算整餐的总营养摄入。
   * 评估营养均衡度（三大营养素供能比、微量营养素密度）。
   * 识别潜在风险（高钠、高脂、高糖、低纤维等）。
   * 生成具体的改进建议（如：去皮、少蘸汁、增加绿叶菜）。

用户信息：
{userInfo}
用户反馈：
{userFeedback}

# Output Format
请**严格**仅返回一个标准的 JSON 对象，不要包含任何 Markdown 代码块标记（如 \`\`\`json ... \`\`\`）、解释性文字或前言后语。

## JSON 结构定义
{
  "success": boolean,
  "imageQuality": {
    "clarity": "high",
    "lighting": "good",
    "occlusionLevel": "low"
  },
  "mealOverview": {
    "mealType": "午餐",
    "totalCalories": 595,
    "overallHealthScore": 65,
    "healthTags": {
      "positive": ["高蛋白", "碳水充足"],
      "warning": ["高钠", "高脂"]
    },
    "summary": "这是一份典型的中式盖浇饭。米饭分量充足，但肉类经过油炸且酱汁浓郁，蔬菜量明显不足。整体呈现高碳水、高脂肪、低纤维特征。"
  },
  "foods": [
    {
      "id": "food_001",
      "name": "宫保鸡丁",
      "category": "肉类",
      "ingredientsDetected": ["鸡胸肉", "花生", "干辣椒", "葱段"],
      "cookingMethod": {
        "technique": "爆炒",
        "oilLevel": "high",
        "saltLevel": "medium",
        "sugarLevel": "medium",
        "visualCues": "表面有明显油光，花生呈金黄色，酱汁浓稠挂壁"
      },
      "portionEstimation": {
        "minWeight": 120,
        "maxWeight": 150,
        "estimatedWeight": 135,
        "unit": "g",
        "confidence": 0.85,
        "referenceObject": "标准饭碗的一半"
      },
      "nutrientsEstimation": {
        "calories": 240,
        "protein": 18.5,
        "fat": 14.0,
        "saturatedFat": 2.5,
        "carbohydrate": 8.0,
        "fiber": 1.2,
        "sugar": 4.5,
        "sodium": 480,
        "addedOilEstimate": 8.0
      }
    },
    {
      "id": "food_002",
      "name": "白米饭",
      "category": "主食",
      "ingredientsDetected": ["粳米"],
      "cookingMethod": {
        "technique": "蒸煮",
        "oilLevel": "none",
        "saltLevel": "none",
        "sugarLevel": "none",
        "visualCues": "颗粒分明，无额外拌油"
      },
      "portionEstimation": {
        "minWeight": 200,
        "maxWeight": 250,
        "estimatedWeight": 225,
        "unit": "g",
        "confidence": 0.90,
        "referenceObject": "标准饭碗一平碗"
      },
      "nutrientsEstimation": {
        "calories": 290,
        "protein": 6.0,
        "fat": 0.5,
        "saturatedFat": 0.1,
        "carbohydrate": 64.0,
        "fiber": 1.0,
        "sugar": 0.1,
        "sodium": 2,
        "addedOilEstimate": 0
      }
    }
  ],
  "dietaryAdvice": "建议减少酱汁摄入，增加绿叶蔬菜份量至150g以上。可以选择去皮鸡肉减少脂肪摄入。"
}

## 错误处理
如果图片模糊、非食物内容或完全无法识别，请返回：
{
  "success": false,
  "message": "无法识别原因说明（例如：图片过于模糊/未检测到食物/光线太暗）"
}

# Constraints
- 数值必须为数字类型，不要带单位符号在数字内。
- 钠的单位必须是 mg，其他宏观营养素单位为 g，热量为 kcal。
- 保持客观，对于不确定的部分，通过降低 confidence 分数体现，而不是编造数据。
- 输出必须是纯文本 JSON 格式。`,

  chat: `你是一位友好、专业的AI营养师助手。你的职责是：
1. 帮助用户记录和分析饮食
2. 提供营养健康方面的建议
3. 解答用户关于饮食健康的问题
4. 给予用户鼓励和支持

用户信息：
{userProfile}

最近饮食摘要：
{recentDiet}

对话历史：
{conversationHistory}

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
      timeout: 55000
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
    
    const response = await callZhipuAIWithImage(imageUrl, prompt)
    
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
    
    const content = response.choices?.[0]?.message?.content
    
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
