const NUTRIENT_INFO = {
  energy: { name: '能量', goodHigh: null, description: '能量是人体活动的基础，需要根据个人目标（减脂/增肌）和活动量来平衡摄入。' },
  protein: { name: '蛋白质', goodHigh: true, description: '蛋白质是构建肌肉和修复组织的重要营养素，有助于增强免疫力和维持饱腹感。' },
  carbohydrate: { name: '碳水化合物', goodHigh: null, description: '碳水化合物是主要的能量来源，应根据活动量调整摄入量。' },
  saturatedFat: { name: '饱和脂肪', goodHigh: false, description: '饱和脂肪摄入过多可能增加心血管疾病风险，建议控制在总热量的10%以内。' },
  unsaturatedFat: { name: '不饱和脂肪', goodHigh: true, description: '不饱和脂肪有助于降低坏胆固醇，保护心血管健康，适量摄入有益。' },
  transFat: { name: '反式脂肪', goodHigh: false, description: '反式脂肪对健康有害，会增加心脏病和中风风险，应尽量避免摄入。' },
  cholesterol: { name: '胆固醇', goodHigh: false, description: '胆固醇过高可能增加动脉硬化风险，每日建议摄入不超过300mg。' },
  sugar: { name: '糖', goodHigh: false, description: '添加糖摄入过多会导致肥胖、糖尿病等健康问题，建议控制在每日25g以内。' },
  sodium: { name: '钠', goodHigh: false, description: '钠摄入过多会导致高血压，建议每日摄入不超过2300mg（约6g盐）。' },
  dietaryFiber: { name: '膳食纤维', goodHigh: true, description: '膳食纤维有助于消化健康、控制血糖和降低胆固醇，建议每日摄入25-30g。' },
  folate: { name: '叶酸', goodHigh: true, description: '叶酸对细胞分裂和DNA合成至关重要，孕妇尤其需要补充。' },
  vitaminC: { name: '维生素C', goodHigh: true, description: '维生素C是强抗氧化剂，有助于免疫功能和胶原蛋白合成。' },
  vitaminB: { name: 'B族维生素', goodHigh: true, description: 'B族维生素参与能量代谢，对神经系统健康很重要。' },
  vitaminD: { name: '维生素D', goodHigh: true, description: '维生素D促进钙吸收，对骨骼健康至关重要，很多人存在缺乏。' },
  vitaminA: { name: '维生素A', goodHigh: true, description: '维生素A对视力、免疫和皮肤健康很重要。' },
  vitaminB12: { name: '维生素B12', goodHigh: true, description: '维生素B12对神经系统和红细胞形成至关重要，素食者容易缺乏。' },
  vitaminE: { name: '维生素E', goodHigh: true, description: '维生素E是强抗氧化剂，保护细胞免受氧化损伤。' },
  calcium: { name: '钙', goodHigh: true, description: '钙是骨骼和牙齿的主要成分，对神经传导和肌肉收缩也很重要。' },
  iron: { name: '铁', goodHigh: true, description: '铁是血红蛋白的重要组成部分，缺铁会导致贫血和疲劳。' },
  zinc: { name: '锌', goodHigh: true, description: '锌参与免疫功能和伤口愈合，对味觉和食欲也很重要。' },
  potassium: { name: '钾', goodHigh: true, description: '钾有助于维持电解质平衡和血压稳定，对心脏健康很重要。' },
  magnesium: { name: '镁', goodHigh: true, description: '镁参与300多种酶反应，对肌肉和神经功能很重要。' },
  selenium: { name: '硒', goodHigh: true, description: '硒是重要的抗氧化矿物质，有助于甲状腺功能和免疫健康。' },
  iodine: { name: '碘', goodHigh: true, description: '碘是甲状腺激素的重要成分，对代谢和发育至关重要。' }
}

Component({
  properties: {
    foods: {
      type: Array,
      value: []
    },
    mealOverview: {
      type: Object,
      value: {
        mealType: '',
        totalCalories: 0,
        overallHealthScore: 0,
        healthTags: {
          positive: [],
          warning: []
        },
        summary: ''
      }
    },
    dietaryAdvice: {
      type: String,
      value: ''
    },
    recordId: {
      type: String,
      value: ''
    },
    editable: {
      type: Boolean,
      value: true
    },
    actionCompleted: {
      type: Boolean,
      value: false
    }
  },

  data: {
    scoreColor: '#4CAF50',
    processedFoods: [],
    expandedFoodIndex: -1,
    showNutrientInfo: false,
    currentNutrientInfo: null,
    nutrientInfo: NUTRIENT_INFO
  },

  lifetimes: {
    attached: function() {
      this.processFoods(this.properties.foods)
    }
  },

  observers: {
    'mealOverview.overallHealthScore': function(score) {
      let color = '#4CAF50'
      if (score < 40) {
        color = '#F44336'
      } else if (score < 60) {
        color = '#FF9800'
      } else if (score < 80) {
        color = '#8BC34A'
      }
      this.setData({ scoreColor: color })
    },
    'foods': function(foods) {
      this.processFoods(foods)
      if (foods && foods.length > 0) {
        this.setData({ expandedFoodIndex: 0 })
        setTimeout(() => {
          this.setData({ expandedFoodIndex: -1 })
        }, 500)
      }
    }
  },

  methods: {
    processFoods: function(foods) {
      if (foods && foods.length > 0) {
        const processedFoods = foods.map(food => ({
          ...food,
          categoryIcon: this.getCategoryIcon(food.category),
          estimatedWeight: food.estimatedWeight || (food.portionEstimation && food.portionEstimation.estimatedWeight) || 100,
          displayCalories: food.totalCalories || 0,
          expanded: false,
          nutrientsList: this.buildNutrientsList(food.nutrientsEstimation)
        }))
        this.setData({ processedFoods })
      }
    },

    buildNutrientsList: function(nutrientsEstimation) {
      if (!nutrientsEstimation) return []
      
      const list = []
      const mainNutrients = ['energy', 'protein', 'carbohydrate', 'saturatedFat', 'unsaturatedFat', 'transFat', 'cholesterol', 'sugar', 'sodium', 'dietaryFiber']
      
      mainNutrients.forEach(key => {
        if (nutrientsEstimation[key] !== undefined) {
          const info = NUTRIENT_INFO[key] || { name: key, goodHigh: null, description: '' }
          list.push({
            key,
            name: info.name,
            level: nutrientsEstimation[key],
            goodHigh: info.goodHigh,
            description: info.description,
            showWarning: this.shouldShowWarning(key, nutrientsEstimation[key])
          })
        }
      })

      if (nutrientsEstimation.vitamins) {
        Object.keys(nutrientsEstimation.vitamins).forEach(key => {
          const info = NUTRIENT_INFO[key] || { name: key, goodHigh: true, description: '' }
          list.push({
            key,
            name: info.name,
            level: nutrientsEstimation.vitamins[key],
            goodHigh: true,
            description: info.description,
            showWarning: false,
            isSubNutrient: true,
            category: '维生素'
          })
        })
      }

      if (nutrientsEstimation.minerals) {
        Object.keys(nutrientsEstimation.minerals).forEach(key => {
          const info = NUTRIENT_INFO[key] || { name: key, goodHigh: true, description: '' }
          list.push({
            key,
            name: info.name,
            level: nutrientsEstimation.minerals[key],
            goodHigh: true,
            description: info.description,
            showWarning: false,
            isSubNutrient: true,
            category: '矿物质'
          })
        })
      }

      return list
    },

    shouldShowWarning: function(key, level) {
      const info = NUTRIENT_INFO[key]
      if (!info) return false
      
      if (info.goodHigh === false && level >= 60) return true
      if (info.goodHigh === true && level <= 30) return true
      
      return false
    },

    getProgressColor: function(level, goodHigh) {
      if (goodHigh === false) {
        if (level >= 70) return '#F44336'
        if (level >= 50) return '#FF9800'
        return '#4CAF50'
      } else if (goodHigh === true) {
        if (level >= 70) return '#4CAF50'
        if (level >= 40) return '#FF9800'
        return '#F44336'
      }
      return '#4CAF50'
    },

    onConfirm: function() {
      this.triggerEvent('confirm', {
        foods: this.properties.foods,
        mealOverview: this.properties.mealOverview,
        dietaryAdvice: this.properties.dietaryAdvice,
        recordId: this.properties.recordId
      })
    },

    onEdit: function() {
      this.triggerEvent('edit', {
        foods: this.properties.foods,
        mealOverview: this.properties.mealOverview
      })
    },

    onFoodTap: function(e) {
      const { index } = e.currentTarget.dataset
      const food = this.properties.foods[index]
      
      this.triggerEvent('foodtap', {
        food,
        index
      })
    },

    toggleNutrients: function(e) {
      const { index } = e.currentTarget.dataset
      const { processedFoods, expandedFoodIndex } = this.data
      
      if (expandedFoodIndex === index) {
        this.setData({ expandedFoodIndex: -1 })
      } else {
        this.setData({ expandedFoodIndex: index })
      }
    },

    onNutrientInfoTap: function(e) {
      const { key, name, description } = e.currentTarget.dataset
      
      wx.showModal({
        title: name,
        content: description,
        showCancel: false,
        confirmText: '知道了'
      })
    },

    getCategoryIcon: function(category) {
      const icons = {
        '主食': '🍚',
        '肉类': '🍖',
        '蔬菜': '🥬',
        '水果': '🍎',
        '豆制品': '🫘',
        '零食/甜点': '🍪',
        '其他': '🍽️'
      }
      return icons[category] || '🍽️'
    }
  }
})
