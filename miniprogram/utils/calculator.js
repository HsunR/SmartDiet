/**
 * @fileoverview 营养计算工具模块
 * @description 提供BMR基础代谢率、TDEE每日总消耗、目标卡路里、营养素分配等计算功能
 * @module utils/calculator
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const calculator = require('./calculator');
 *
 * // 计算基础代谢率
 * const bmr = calculator.calculateBMR({ weight: 70, height: 175, age: 25, gender: '男' });
 *
 * // 计算目标卡路里
 * const targetCalories = calculator.calculateTargetCalories(profile);
 */

const { ACTIVITY_LEVELS, DEFAULT_CALORIES_TARGET } = require('./constants')

/**
 * 计算基础代谢率(BMR) - 使用Mifflin-St Jeor公式
 * @description 根据体重、身高、年龄和性别计算基础代谢率
 * @param {Object} params - 计算参数
 * @param {number} params.weight - 体重(kg)
 * @param {number} params.height - 身高(cm)
 * @param {number} params.age - 年龄
 * @param {string} params.gender - 性别 ('男' | '女' | 'male' | 'female')
 * @returns {number} 基础代谢率（卡路里/天）
 * @example
 * // 男性
 * calculator.calculateBMR({ weight: 70, height: 175, age: 25, gender: '男' });
 * // 返回: 约 1668
 *
 * // 女性
 * calculator.calculateBMR({ weight: 55, height: 160, age: 30, gender: '女' });
 * // 返回: 约 1286
 */
const calculateBMR = ({ weight, height, age, gender }) => {
  let bmr = 10 * weight + 6.25 * height - 5 * age

  if (gender === '男' || gender === 'male') {
    bmr += 5
  } else {
    bmr -= 161
  }

  return Math.round(bmr)
}

/**
 * 计算每日总消耗(TDEE)
 * @description 根据基础代谢率和活动水平计算每日总能量消耗
 * @param {Object} params - 计算参数
 * @param {number} params.bmr - 基础代谢率
 * @param {number} params.activityLevel - 活动水平系数 (1.2-1.9)
 * @returns {number} 每日总消耗（卡路里/天）
 * @example
 * const tdee = calculator.calculateTDEE({
 *   bmr: 1668,
 *   activityLevel: 1.55  // 中度活动
 * });
 * // 返回: 约 2585
 */
const calculateTDEE = ({ bmr, activityLevel }) => {
  return Math.round(bmr * activityLevel)
}

/**
 * 计算目标卡路里
 * @description 根据用户档案计算每日目标卡路里摄入量，考虑用户的体重目标
 * @param {Object} profile - 用户档案
 * @param {number} profile.weight - 体重(kg)
 * @param {number} profile.height - 身高(cm)
 * @param {number} profile.age - 年龄
 * @param {string} profile.gender - 性别
 * @param {number} [profile.activityLevel] - 活动水平系数，默认1.55
 * @param {string} [profile.goal] - 体重目标 ('lose_weight' | 'gain_muscle' | 'maintain')
 * @returns {number} 目标卡路里摄入量
 * @example
 * // 减脂目标
 * calculator.calculateTargetCalories({
 *   weight: 70, height: 175, age: 25, gender: '男',
 *   goal: 'lose_weight'
 * });
 * // 返回: TDEE * 0.8 (约2068)
 *
 * // 增肌目标
 * calculator.calculateTargetCalories({
 *   weight: 70, height: 175, age: 25, gender: '男',
 *   goal: 'gain_muscle'
 * });
 * // 返回: TDEE * 1.15 (约2973)
 */
const calculateTargetCalories = profile => {
  if (!profile || !profile.weight || !profile.height || !profile.age) {
    return DEFAULT_CALORIES_TARGET
  }

  const bmr = calculateBMR({
    weight: profile.weight,
    height: profile.height,
    age: profile.age,
    gender: profile.gender
  })

  const tdee = calculateTDEE({
    bmr,
    activityLevel: profile.activityLevel || ACTIVITY_LEVELS.MODERATE
  })

  const goal = profile.goal || 'maintain'

  // 根据目标调整卡路里
  switch (goal) {
    case 'lose_weight':
      return Math.round(tdee * 0.8)  // 减脂：减少20%
    case 'gain_muscle':
      return Math.round(tdee * 1.15) // 增肌：增加15%
    default:
      return tdee  // 维持：保持不变
  }
}

/**
 * 计算宏量营养素目标
 * @description 根据目标卡路里和体重目标计算蛋白质、脂肪、碳水化合物的摄入量(克)
 * @param {Object} profile - 用户档案
 * @param {string} [profile.goal] - 体重目标
 * @param {number} [profile.targetCalories] - 目标卡路里
 * @returns {Object} 营养素目标对象
 * @returns {number} returns.calories - 目标卡路里
 * @returns {number} returns.protein - 蛋白质目标(克)
 * @returns {number} returns.fat - 脂肪目标(克)
 * @returns {number} returns.carbohydrate - 碳水化合物目标(克)
 * @example
 * calculator.calculateNutrientTargets({
 *   goal: 'lose_weight',
 *   targetCalories: 2000
 * });
 * // 返回: { calories: 2000, protein: 150, fat: 56, carbohydrate: 225 }
 */
const calculateNutrientTargets = profile => {
  const goal = profile.goal || 'maintain'

  // 不同目标的营养素比例
  let proteinRatio = 0.25
  let fatRatio = 0.25
  let carbRatio = 0.5

  if (goal === 'lose_weight') {
    proteinRatio = 0.3  // 减脂：提高蛋白质比例
    fatRatio = 0.25
    carbRatio = 0.45
  } else if (goal === 'gain_muscle') {
    proteinRatio = 0.3  // 增肌：提高蛋白质比例
    fatRatio = 0.2
    carbRatio = 0.5
  } else if (goal === 'control_sugar') {
    proteinRatio = 0.25
    fatRatio = 0.3      // 控糖：提高脂肪比例，降低碳水
    carbRatio = 0.45
  }

  const calories = profile.targetCalories || calculateTargetCalories(profile)

  // 计算各营养素克数 (蛋白质:4卡/克, 脂肪:9卡/克, 碳水:4卡/克)
  return {
    calories,
    protein: Math.round((calories * proteinRatio) / 4),
    fat: Math.round((calories * fatRatio) / 9),
    carbohydrate: Math.round((calories * carbRatio) / 4)
  }
}

/**
 * 导出计算模块
 * @exports calculator
 */
module.exports = {
  /**
   * 计算基础代谢率(BMR)
   * @type {Function}
   */
  calculateBMR,
  /**
   * 计算每日总消耗(TDEE)
   * @type {Function}
   */
  calculateTDEE,
  /**
   * 计算目标卡路里
   * @type {Function}
   */
  calculateTargetCalories,
  /**
   * 计算宏量营养素目标
   * @type {Function}
   */
  calculateNutrientTargets
}
