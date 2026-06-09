/**
 * 食物卡片组件
 * 展示 AI 识别的食物列表、营养信息和建议
 * 支持编辑和确认操作
 * @component FoodCard
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性（外部传入的数据）
   */
  properties: {
    foods: {
      type: Array,
      value: []
    },
    mealOverview: {
      type: Object,
      value: {
        mealType: '',
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
    rating: {
      type: Number,
      value: 0
    },
    editable: {
      type: Boolean,
      value: true
    },
    actionCompleted: {
      type: Boolean,
      value: false
    },
    isStreaming: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件内部数据
   */
  data: {
    scoreColor: '#FF9800',      // 健康评分颜色（橙色）
    processedFoods: [],         // 处理后的食物列表
    expandedFoodIndex: -1       // 展开的食物索引
  },

  /**
   * 组件生命周期回调
   */
  lifetimes: {
    /**
     * 组件被附加到页面时触发
     * 处理食物数据
     */
    attached: function() {
      this.processFoods(this.properties.foods)
    }
  },

  /**
   * 数据监听器（监听属性变化）
   */
  observers: {
    /**
     * 监听食物列表变化，重新处理数据
     * @param {Array<Object>} foods - 食物列表
     */
    'foods': function(foods) {
      this.processFoods(foods)
      // 自动展开第一个食物项
      if (foods && foods.length > 0) {
        this.setData({ expandedFoodIndex: 0 })
        setTimeout(() => {
          this.setData({ expandedFoodIndex: -1 })
        }, 500)
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 处理食物数据，添加图标和默认值
     * @param {Array<Object>} foods - 原始食物列表
     */
    processFoods: function(foods) {
      if (foods && foods.length > 0) {
        const processedFoods = foods.map(food => {
          const tags = food.tags || { positive: [], warning: [] }
          const tagReasons = food.tagReasons || {}
          return {
            ...food,
            categoryIcon: this.getCategoryIcon(food.category),
            estimatedWeight: food.estimatedWeight || (food.portionEstimation && food.portionEstimation.estimatedWeight) || 100,
            displayScore: food.score || 60,
            expanded: false,
            tags: tags,
            tagReasons: tagReasons,
            positiveTagsWithReasons: (tags.positive || []).map(tag => ({
              label: tag,
              reason: tagReasons[tag] || ''
            })),
            warningTagsWithReasons: (tags.warning || []).map(tag => ({
              label: tag,
              reason: tagReasons[tag] || ''
            }))
          }
        })
        this.setData({ processedFoods })
      }
    },

    /**
     * 确认按钮点击事件
     * 触发自定义 confirm 事件，向父组件传递数据
     */
    onConfirm: function() {
      this.triggerEvent('confirm', {
        foods: this.properties.foods,
        mealOverview: this.properties.mealOverview,
        dietaryAdvice: this.properties.dietaryAdvice,
        recordId: this.properties.recordId
      })
    },

    /**
     * 编辑按钮点击事件
     * 触发自定义 edit 事件
     */
    onEdit: function() {
      this.triggerEvent('edit', {
        foods: this.properties.foods,
        mealOverview: this.properties.mealOverview
      })
    },

    /**
     * 食物项点击事件
     * @param {Object} e - 事件对象
     */
    onFoodTap: function(e) {
      const { index } = e.currentTarget.dataset
      const food = this.properties.foods[index]
      
      this.triggerEvent('foodtap', {
        food,
        index
      })
    },

    /**
     * 根据食物类别获取对应图标
     * @param {string} category - 食物类别
     * @returns {string} Emoji 图标
     */
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