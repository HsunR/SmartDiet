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
    totalCalories: 0
  },

  observers: {
    'foods': function(foods) {
      const totalCalories = foods.reduce((sum, f) => sum + (f.nutrients?.calories || 0), 0)
      this.setData({ totalCalories })
    }
  },

  methods: {
    onConfirm: function() {
      this.triggerEvent('confirm', {
        foods: this.properties.foods,
        recordId: this.properties.recordId
      })
    },

    onEdit: function() {
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
