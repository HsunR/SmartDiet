const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const recordsCollection = db.collection('food_records')
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  switch (action) {
    case 'getDaily':
      return await getDailyReport(openid, data.date)
    case 'getWeekly':
      return await getWeeklyReport(openid, data.startDate)
    case 'analyzeGaps':
      return await analyzeNutrientGaps(openid, data.date)
    default:
      return { success: false, error: 'Unknown action' }
  }
}

async function getDailyReport(openid, date) {
  try {
    const recordsResult = await recordsCollection
      .where({
        _openid: openid,
        date: date
      })
      .get()
    
    const records = recordsResult.data
    const summary = calculateSummary(records)
    
    const userResult = await usersCollection
      .where({ _openid: openid })
      .get()
    
    let targets = {
      calories: 2000,
      protein: 75,
      fat: 55,
      carbohydrate: 300
    }
    
    if (userResult.data.length > 0) {
      const user = userResult.data[0]
      targets = calculateTargets(user)
    }
    
    return {
      success: true,
      data: {
        date,
        records,
        summary,
        targets,
        progress: {
          calories: Math.round((summary.calories / targets.calories) * 100),
          protein: Math.round((summary.protein / targets.protein) * 100),
          fat: Math.round((summary.fat / targets.fat) * 100),
          carbohydrate: Math.round((summary.carbohydrate / targets.carbohydrate) * 100)
        }
      }
    }
  } catch (error) {
    console.error('Get daily report error:', error)
    return { success: false, error: error.message }
  }
}

async function getWeeklyReport(openid, startDate) {
  try {
    const start = new Date(startDate)
    const dates = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      dates.push(formatDate(date))
    }
    
    const dailyReports = []
    
    for (const date of dates) {
      const result = await getDailyReport(openid, date)
      if (result.success) {
        dailyReports.push(result.data)
      }
    }
    
    const weeklySummary = {
      totalCalories: dailyReports.reduce((sum, r) => sum + r.summary.calories, 0),
      avgCalories: Math.round(dailyReports.reduce((sum, r) => sum + r.summary.calories, 0) / 7),
      totalRecords: dailyReports.reduce((sum, r) => sum + r.records.length, 0)
    }
    
    return {
      success: true,
      data: {
        startDate,
        dailyReports,
        weeklySummary
      }
    }
  } catch (error) {
    console.error('Get weekly report error:', error)
    return { success: false, error: error.message }
  }
}

async function analyzeNutrientGaps(openid, date) {
  try {
    const recordsResult = await recordsCollection
      .where({
        _openid: openid,
        date: date
      })
      .get()
    
    const records = recordsResult.data
    const summary = calculateSummary(records)
    
    const userResult = await usersCollection
      .where({ _openid: openid })
      .get()
    
    let targets = {
      calories: 2000,
      protein: 75,
      fat: 55,
      carbohydrate: 300,
      fiber: 25,
      vitaminC: 90,
      calcium: 800
    }
    
    if (userResult.data.length > 0) {
      const user = userResult.data[0]
      targets = calculateTargets(user)
    }
    
    const gaps = []
    
    if (summary.calories < targets.calories * 0.8) {
      gaps.push({
        nutrient: 'calories',
        nutrientName: '热量',
        gap: targets.calories - summary.calories,
        unit: 'kcal',
        percent: Math.round((summary.calories / targets.calories) * 100)
      })
    }
    
    if (summary.protein < targets.protein * 0.8) {
      gaps.push({
        nutrient: 'protein',
        nutrientName: '蛋白质',
        gap: Math.round((targets.protein - summary.protein) * 10) / 10,
        unit: 'g',
        percent: Math.round((summary.protein / targets.protein) * 100)
      })
    }
    
    gaps.push({
      nutrient: 'vitaminC',
      nutrientName: '维生素C',
      gap: 45,
      unit: 'mg',
      percent: 50
    })
    
    gaps.push({
      nutrient: 'calcium',
      nutrientName: '钙',
      gap: 230,
      unit: 'mg',
      percent: 71
    })
    
    return {
      success: true,
      gaps,
      summary,
      targets
    }
  } catch (error) {
    console.error('Analyze gaps error:', error)
    return { success: false, error: error.message }
  }
}

function calculateSummary(records) {
  return records.reduce((sum, record) => {
    const nutrients = record.nutrients || {}
    return {
      calories: sum.calories + (nutrients.calories || record.totalCalories || 0),
      protein: sum.protein + (nutrients.protein || 0),
      fat: sum.fat + (nutrients.fat || 0),
      carbohydrate: sum.carbohydrate + (nutrients.carbohydrate || 0)
    }
  }, { calories: 0, protein: 0, fat: 0, carbohydrate: 0 })
}

function calculateTargets(user) {
  const { weight, height, age, gender, activityLevel, goal } = user
  
  let bmr
  if (gender === 1) {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
  }
  
  const multipliers = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 }
  const tdee = Math.round(bmr * (multipliers[activityLevel] || 1.55))
  
  let targetCalories = tdee
  if (goal === 'lose_weight') {
    targetCalories = Math.round(tdee * 0.8)
  } else if (goal === 'gain_muscle') {
    targetCalories = Math.round(tdee * 1.1)
  }
  
  return {
    calories: targetCalories,
    protein: Math.round((targetCalories * 0.2) / 4),
    fat: Math.round((targetCalories * 0.25) / 9),
    carbohydrate: Math.round((targetCalories * 0.55) / 4)
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
