const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const recordsCollection = db.collection('food_records')
const usersCollection = db.collection('users')

const PROMPT_TEMPLATES = {
  foodRecognition: `你是一位专业的营养师AI助手。请分析这张食物图片，识别其中的食物。

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
  "description": "对图片中食物的简要描述"
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
  
  const mockResult = {
    foods: [
      {
        name: '米饭',
        category: '主食',
        estimatedWeight: 150,
        confidence: 0.95,
        nutrients: {
          calories: 174,
          protein: 3.8,
          fat: 0.5,
          carbohydrate: 38.1
        }
      },
      {
        name: '红烧肉',
        category: '肉类',
        estimatedWeight: 100,
        confidence: 0.92,
        nutrients: {
          calories: 358,
          protein: 15.4,
          fat: 30.8,
          carbohydrate: 3.2
        }
      },
      {
        name: '炒青菜',
        category: '蔬菜',
        estimatedWeight: 120,
        confidence: 0.88,
        nutrients: {
          calories: 32,
          protein: 2.4,
          fat: 1.2,
          carbohydrate: 4.8
        }
      }
    ],
    description: '这是一份典型的中式午餐，包含米饭、红烧肉和炒青菜。'
  }
  
  return mockResult
}

async function handleNutritionAnalysis(data) {
  const { foodInfo, userInfo } = data
  
  const nutrients = {
    calories: 564,
    protein: 21.6,
    fat: 32.5,
    carbohydrate: 46.1,
    fiber: 2.4,
    vitamins: {
      vitaminC: 28,
      vitaminA: 156
    },
    minerals: {
      calcium: 68,
      iron: 3.2,
      sodium: 420
    },
    analysisNotes: '本餐热量适中，蛋白质含量充足，建议增加蔬菜摄入量以补充膳食纤维。'
  }
  
  return { nutrients }
}

async function handleRecommendation(openid, data) {
  const { gaps, preferences } = data
  
  const suggestions = [
    {
      type: '补充',
      nutrient: '维生素C',
      foods: ['橙子', '猕猴桃', '西红柿'],
      reason: '今日维生素C摄入不足，建议补充富含维生素C的水果'
    },
    {
      type: '补充',
      nutrient: '钙',
      foods: ['牛奶', '酸奶', '豆腐'],
      reason: '钙摄入量偏低，建议增加乳制品或豆制品'
    },
    {
      type: '调整',
      nutrient: '钠',
      foods: ['减少腌制食品', '控制盐量'],
      reason: '钠摄入偏高，建议减少盐分摄入'
    }
  ]
  
  return { suggestions }
}

async function handleChat(openid, data) {
  const { message, context } = data
  
  let reply = ''
  
  if (message.includes('你好') || message.includes('您好')) {
    reply = '您好！我是您的AI营养师，很高兴为您服务。今天想记录什么美食呢？'
  } else if (message.includes('建议') || message.includes('推荐')) {
    reply = '根据您今天的饮食情况，我建议您：\n1. 增加蔬菜水果的摄入\n2. 适量补充优质蛋白质\n3. 注意控制盐分摄入\n\n需要更详细的建议吗？'
  } else if (message.includes('热量') || message.includes('卡路里')) {
    reply = '热量是衡量食物能量的单位。一般成年人每日需要约1800-2500千卡热量。具体需求因人而异，取决于年龄、性别、体重和活动量等因素。'
  } else if (message.includes('蛋白质')) {
    reply = '蛋白质是人体必需的营养素，建议每日摄入量约为体重(kg)×0.8-1.2g。优质蛋白质来源包括：鸡蛋、鱼肉、瘦肉、豆制品等。'
  } else {
    reply = '感谢您的提问！作为您的AI营养师，我可以帮您：\n• 📷 拍照识别食物并计算营养\n• 📊 查看每日饮食报告\n• 💡 获取个性化饮食建议\n\n请随时告诉我您的需求！'
  }
  
  return { reply }
}
