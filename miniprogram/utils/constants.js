const { generateId } = require('./util')

const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FOOD_CARD: 'food_card',
  MEAL_TYPE_PICKER: 'meal_type_picker',
  USER_INFO_FORM: 'user_info_form',
  FEEDBACK_INPUT: 'feedback_input',
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

const MEAL_TYPE_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '其他'
}

const USER_GOALS = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN: 'maintain',
  GAIN_MUSCLE: 'gain_muscle',
  CONTROL_SUGAR: 'control_sugar',
  CONTROL_BLOOD_PRESSURE: 'control_blood_pressure'
}

const USER_GOAL_LABELS = {
  lose_weight: '减脂',
  maintain: '维持体重',
  gain_muscle: '增肌',
  control_sugar: '控糖',
  control_blood_pressure: '控血压'
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

const createFoodCardMessage = (foods, mealOverview, dietaryAdvice, recordId) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.FOOD_CARD,
  content: '',
  data: {
    foods: foods || [],
    mealOverview: mealOverview || {
      mealType: '',
      totalCalories: 0,
      overallHealthScore: 0,
      healthTags: { positive: [], warning: [] },
      summary: ''
    },
    dietaryAdvice: dietaryAdvice || '',
    recordId
  },
  timestamp: Date.now()
})

const createMealTypePickerMessage = (mealOverview, foods) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.MEAL_TYPE_PICKER,
  content: '请选择餐次类型：',
  data: {
    mealOverview,
    foods,
    mealTypes: [
      { value: 'breakfast', label: '早餐', icon: '🌅' },
      { value: 'lunch', label: '午餐', icon: '☀️' },
      { value: 'dinner', label: '晚餐', icon: '🌙' },
      { value: 'snack', label: '其他', icon: '🍎' }
    ]
  },
  timestamp: Date.now()
})

const createFeedbackInputMessage = (foods, mealOverview, imageUrl) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.FEEDBACK_INPUT,
  content: '请告诉我识别结果有什么问题，我会重新分析：',
  data: {
    foods,
    mealOverview,
    imageUrl
  },
  timestamp: Date.now()
})

const createUserInfoFormMessage = () => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.USER_INFO_FORM,
  content: '为了给您提供更精准的饮食建议，请先完善您的个人信息：',
  data: {
    fields: [
      { key: 'age', label: '年龄', type: 'number', placeholder: '请输入年龄' },
      { key: 'gender', label: '性别', type: 'picker', options: ['男', '女'] },
      { key: 'height', label: '身高(cm)', type: 'number', placeholder: '请输入身高' },
      { key: 'weight', label: '体重(kg)', type: 'number', placeholder: '请输入体重' },
      { key: 'goals', label: '健康目标', type: 'multiPicker', options: [
        { value: 'lose_weight', label: '减脂' },
        { value: 'maintain', label: '维持体重' },
        { value: 'gain_muscle', label: '增肌' },
        { value: 'control_sugar', label: '控糖' },
        { value: 'control_blood_pressure', label: '控血压' }
      ]}
    ]
  },
  timestamp: Date.now()
})

const createQuickActionsMessage = (actions) => ({
  id: generateId(),
  role: MESSAGE_ROLES.ASSISTANT,
  type: MESSAGE_TYPES.QUICK_ACTIONS,
  content: '您还可以：',
  data: {
    actions: actions || [
      { id: 'photo', label: '拍照识别', icon: '📷' },
      { id: 'report', label: '今日报告', icon: '📊' },
      { id: 'recommend', label: '饮食建议', icon: '💡' }
    ]
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

const calculateBMR = (profile) => {
  const { gender, weight = 65, height = 170, age = 25 } = profile
  if (gender === '男') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5)
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161)
  }
}

const calculateTDEE = (profile) => {
  const bmr = calculateBMR(profile)
  const activityMultiplier = {
    1: 1.2,
    2: 1.375,
    3: 1.55,
    4: 1.725,
    5: 1.9
  }
  const activityLevel = profile.activityLevel || 3
  return Math.round(bmr * (activityMultiplier[activityLevel] || 1.55))
}

const calculateTargetCalories = (profile) => {
  const tdee = calculateTDEE(profile)
  const goal = profile.goal || 'maintain'
  
  switch (goal) {
    case 'lose_weight':
      return Math.round(tdee * 0.8)
    case 'gain_muscle':
      return Math.round(tdee * 1.1)
    default:
      return tdee
  }
}

const calculateNutrientTargets = (profile) => {
  const calories = calculateTargetCalories(profile)
  const goal = profile.goal || 'maintain'
  
  let proteinRatio = 0.25
  let fatRatio = 0.25
  let carbRatio = 0.5
  
  if (goal === 'lose_weight') {
    proteinRatio = 0.3
    fatRatio = 0.25
    carbRatio = 0.45
  } else if (goal === 'gain_muscle') {
    proteinRatio = 0.3
    fatRatio = 0.2
    carbRatio = 0.5
  } else if (goal === 'control_sugar') {
    proteinRatio = 0.25
    fatRatio = 0.3
    carbRatio = 0.45
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
  MEAL_TYPE_LABELS,
  USER_GOALS,
  USER_GOAL_LABELS,
  ACTIVITY_LEVELS,
  NUTRIENT_TARGETS,
  createTextMessage,
  createImageMessage,
  createFoodCardMessage,
  createMealTypePickerMessage,
  createFeedbackInputMessage,
  createUserInfoFormMessage,
  createQuickActionsMessage,
  createReportCardMessage,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateNutrientTargets
}
