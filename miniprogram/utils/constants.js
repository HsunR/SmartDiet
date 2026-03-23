const { generateId } = require('./util')

const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FOOD_CARD: 'food_card',
  REPORT_CARD: 'report_card',
  RECOMMEND_CARD: 'recommend_card',
  QUICK_ACTIONS: 'quick_actions'
}

const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
}

const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack'
}

const USER_GOALS = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN: 'maintain',
  GAIN_MUSCLE: 'gain_muscle'
}

const ACTIVITY_LEVELS = {
  SEDENTARY: 1,
  LIGHT: 2,
  MODERATE: 3,
  ACTIVE: 4,
  VERY_ACTIVE: 5
}

const NUTRIENT_TARGETS = {
  calories: { min: 1200, max: 4000 },
  protein: { min: 30, max: 200 },
  fat: { min: 20, max: 150 },
  carbohydrate: { min: 100, max: 500 },
  fiber: { min: 10, max: 50 },
  vitaminA: { min: 500, max: 3000 },
  vitaminC: { min: 30, max: 2000 },
  calcium: { min: 500, max: 2500 },
  iron: { min: 8, max: 45 }
}

const createTextMessage = (role, content) => ({
  id: generateId(),
  role,
  type: MESSAGE_TYPES.TEXT,
  content,
  timestamp: Date.now()
})

const createImageMessage = (role, imageUrl, thumbnailUrl) => ({
  id: generateId(),
  role,
  type: MESSAGE_TYPES.IMAGE,
  content: '',
  data: {
    imageUrl,
    thumbnailUrl: thumbnailUrl || imageUrl
  },
  timestamp: Date.now()
})

const createFoodCardMessage = (foods, recordId) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.FOOD_CARD,
  content: '',
  data: {
    foods,
    totalCalories: foods.reduce((sum, f) => sum + (f.nutrients?.calories || 0), 0),
    recordId
  },
  timestamp: Date.now()
})

const createReportCardMessage = (reportData) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.REPORT_CARD,
  content: '',
  data: reportData,
  timestamp: Date.now()
})

const createQuickActionsMessage = (actions) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.QUICK_ACTIONS,
  content: '您还可以：',
  data: {
    actions: actions || [
      { id: 'photo', label: '📷 拍照识别', icon: 'camera' },
      { id: 'report', label: '📊 今日报告', icon: 'chart' },
      { id: 'recommend', label: '💡 获取建议', icon: 'bulb' }
    ]
  },
  timestamp: Date.now()
})

const FOOD_CATEGORIES = {
  staple: { name: '主食', icon: '🍚', color: '#FFD54F' },
  meat: { name: '肉类', icon: '🍖', color: '#EF5350' },
  vegetable: { name: '蔬菜', icon: '🥬', color: '#66BB6A' },
  fruit: { name: '水果', icon: '🍎', color: '#FF7043' },
  dairy: { name: '乳制品', icon: '🥛', color: '#90CAF9' },
  beverage: { name: '饮品', icon: '🥤', color: '#80DEEA' },
  snack: { name: '零食', icon: '🍪', color: '#CE93D8' },
  other: { name: '其他', icon: '🍽️', color: '#BDBDBD' }
}

const DEFAULT_USER_PROFILE = {
  nickname: '',
  avatar: '',
  gender: 0,
  age: 25,
  height: 170,
  weight: 65,
  activityLevel: ACTIVITY_LEVELS.MODERATE,
  goal: USER_GOALS.MAINTAIN,
  preferences: [],
  allergies: []
}

const calculateBMR = (weight, height, age, gender) => {
  if (gender === 1) {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
  } else {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
  }
}

const calculateTDEE = (bmr, activityLevel) => {
  const multipliers = {
    1: 1.2,
    2: 1.375,
    3: 1.55,
    4: 1.725,
    5: 1.9
  }
  return Math.round(bmr * (multipliers[activityLevel] || 1.55))
}

const calculateTargetCalories = (tdee, goal) => {
  switch (goal) {
    case USER_GOALS.LOSE_WEIGHT:
      return Math.round(tdee * 0.8)
    case USER_GOALS.GAIN_MUSCLE:
      return Math.round(tdee * 1.1)
    default:
      return tdee
  }
}

const calculateNutrientTargets = (calories, goal) => {
  let proteinRatio = 0.15
  let fatRatio = 0.25
  let carbRatio = 0.6
  
  if (goal === USER_GOALS.LOSE_WEIGHT) {
    proteinRatio = 0.25
    fatRatio = 0.25
    carbRatio = 0.5
  } else if (goal === USER_GOALS.GAIN_MUSCLE) {
    proteinRatio = 0.25
    fatRatio = 0.2
    carbRatio = 0.55
  }
  
  return {
    calories,
    protein: Math.round((calories * proteinRatio) / 4),
    fat: Math.round((calories * fatRatio) / 9),
    carbohydrate: Math.round((calories * carbRatio) / 4)
  }
}

module.exports = {
  MESSAGE_TYPES,
  MESSAGE_ROLES,
  MEAL_TYPES,
  USER_GOALS,
  ACTIVITY_LEVELS,
  NUTRIENT_TARGETS,
  FOOD_CATEGORIES,
  DEFAULT_USER_PROFILE,
  createTextMessage,
  createImageMessage,
  createFoodCardMessage,
  createReportCardMessage,
  createQuickActionsMessage,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateNutrientTargets
}
