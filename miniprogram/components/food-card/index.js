Component({
  properties: {
    foods: {
      type: Array,
      value: []
    },
    recordId: {
      type: String,
      value: ''
    },
    editable: {
      type: Boolean,
      value: true
    }
  },

  data: {
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarb: 0,
    proteinPercent: 0,
    fatPercent: 0,
    carbPercent: 0
  },

  observers: {
    'foods': function(foods) {
      const totalCalories = foods.reduce((sum, f) => sum + (f.nutrients?.calories || 0), 0)
      const totalProtein = foods.reduce((sum, f) => sum + (f.nutrients?.protein || 0), 0)
      const totalFat = foods.reduce((sum, f) => sum + (f.nutrients?.fat || 0), 0)
      const totalCarb = foods.reduce((sum, f) => sum + (f.nutrients?.carbohydrate || 0), 0)
      
      this.setData({
        totalCalories,
        totalProtein,
        totalFat,
        totalCarb,
        proteinPercent: Math.min(totalProtein / 100 * 100, 100),
        fatPercent: Math.min(totalFat / 80 * 100, 100),
        carbPercent: Math.min(totalCarb / 300 * 100, 100)
      })
    }
  },

  methods: {
    onConfirm: function() {
      console.log('food-card onConfirm triggered')
      console.log('foods:', this.properties.foods)
      this.triggerEvent('confirm', {
        foods: this.properties.foods,
        recordId: this.properties.recordId
      })
    },

    onEdit: function() {
      console.log('food-card onEdit triggered')
      console.log('foods:', this.properties.foods)
      this.triggerEvent('edit', {
        foods: this.properties.foods
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

    getCategoryIcon: function(category) {
      const icons = {
        '主食': '🍚',
        '肉类': '🍖',
        '蔬菜': '🥬',
        '水果': '🍎',
        '乳制品': '🥛',
        '饮品': '🥤',
        '零食': '🍪',
        '其他': '🍽️'
      }
      return icons[category] || '🍽️'
    }
  }
})
