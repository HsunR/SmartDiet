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
    expandedFoodIndex: -1
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
          tags: food.tags || { positive: [], warning: [] }
        }))
        this.setData({ processedFoods })
      }
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
