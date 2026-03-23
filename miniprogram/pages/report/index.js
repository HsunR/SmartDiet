const { formatDate, calculateProgress, getProgressStatus } = require('../../utils/util')
const { MEAL_TYPES, calculateNutrientTargets } = require('../../utils/constants')
const { api, safeApiCall } = require('../../utils/api')

Page({
  data: {
    currentDate: '',
    records: [],
    summary: {
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrate: 0
    },
    targets: {
      calories: 2000,
      protein: 75,
      fat: 55,
      carbohydrate: 300
    },
    progress: {
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrate: 0
    },
    progressColor: {
      calories: '#4CAF50',
      protein: '#4CAF50',
      fat: '#4CAF50',
      carbohydrate: '#4CAF50'
    },
    gaps: [],
    loading: true,
    activeTab: 'overview',
    tabs: [
      { key: 'overview', name: '概览' },
      { key: 'detail', name: '详情' },
      { key: 'trend', name: '趋势' }
    ],
    weekData: [],
    weekSummary: {
      totalCalories: 0,
      avgCalories: 0,
      targetDays: 0
    },
    mealRecords: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    },
    mealCalories: {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0
    }
  },

  onLoad: function() {
    this.setData({
      currentDate: formatDate(new Date())
    })
    this.loadDailyReport()
  },

  onShow: function() {
    this.loadDailyReport()
  },

  onPullDownRefresh: function() {
    this.loadDailyReport().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadDailyReport: async function() {
    this.setData({ loading: true })
    
    try {
      const { currentDate } = this.data
      
      const recordsResult = await safeApiCall(() => api.food.getRecords(currentDate))
      
      if (recordsResult.success) {
        const records = recordsResult.data || []
        const mealRecords = this.groupByMeal(records)
        const summary = this.calculateSummary(records)
        const progress = this.calculateProgress(summary)
        const progressColor = this.getProgressColors(progress)
        const mealCalories = this.calculateMealCalories(mealRecords)
        
        this.setData({
          records,
          mealRecords,
          summary,
          progress,
          progressColor,
          mealCalories
        })
      }
      
      const gapsResult = await safeApiCall(() => api.report.analyzeGaps(currentDate))
      
      if (gapsResult.success && gapsResult.gaps) {
        this.setData({
          gaps: gapsResult.gaps
        })
      }
      
      await this.loadWeekData()
      
    } catch (error) {
      console.error('Load report error:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  groupByMeal: function(records) {
    const mealRecords = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    }
    
    records.forEach(record => {
      const mealType = record.mealType || 'snack'
      if (mealRecords[mealType]) {
        record.foodsNames = (record.foods || []).map(f => f.name).join('、')
        mealRecords[mealType].push(record)
      }
    })
    
    return mealRecords
  },

  calculateSummary: function(records) {
    return records.reduce((sum, record) => {
      const nutrients = record.nutrients || {}
      return {
        calories: sum.calories + (nutrients.calories || record.totalCalories || 0),
        protein: sum.protein + (nutrients.protein || 0),
        fat: sum.fat + (nutrients.fat || 0),
        carbohydrate: sum.carbohydrate + (nutrients.carbohydrate || 0)
      }
    }, { calories: 0, protein: 0, fat: 0, carbohydrate: 0 })
  },

  calculateProgress: function(summary) {
    const { targets } = this.data
    return {
      calories: Math.min(Math.round((summary.calories / targets.calories) * 100), 150),
      protein: Math.min(Math.round((summary.protein / targets.protein) * 100), 150),
      fat: Math.min(Math.round((summary.fat / targets.fat) * 100), 150),
      carbohydrate: Math.min(Math.round((summary.carbohydrate / targets.carbohydrate) * 100), 150)
    }
  },

  getProgressColors: function(progress) {
    const getColor = (percent) => {
      if (percent < 50) return '#FF9800'
      if (percent <= 100) return '#4CAF50'
      if (percent <= 110) return '#FF9800'
      return '#F44336'
    }
    return {
      calories: getColor(progress.calories),
      protein: getColor(progress.protein),
      fat: getColor(progress.fat),
      carbohydrate: getColor(progress.carbohydrate)
    }
  },

  calculateMealCalories: function(mealRecords) {
    return {
      breakfast: mealRecords.breakfast.reduce((sum, r) => sum + (r.totalCalories || 0), 0),
      lunch: mealRecords.lunch.reduce((sum, r) => sum + (r.totalCalories || 0), 0),
      dinner: mealRecords.dinner.reduce((sum, r) => sum + (r.totalCalories || 0), 0),
      snack: mealRecords.snack.reduce((sum, r) => sum + (r.totalCalories || 0), 0)
    }
  },

  loadWeekData: async function() {
    const weekData = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatDate(date)
      
      try {
        const result = await safeApiCall(() => api.food.getRecords(dateStr))
        const records = result.success ? (result.data || []) : []
        const summary = this.calculateSummary(records)
        const percent = Math.round((summary.calories / this.data.targets.calories) * 100)
        
        weekData.push({
          date: dateStr,
          day: this.getDayName(date),
          calories: summary.calories,
          target: this.data.targets.calories,
          percent: percent,
          barColor: (percent >= 80 && percent <= 110) ? '#4CAF50' : '#FF9800'
        })
      } catch (error) {
        weekData.push({
          date: dateStr,
          day: this.getDayName(date),
          calories: 0,
          target: this.data.targets.calories,
          percent: 0,
          barColor: '#FF9800'
        })
      }
    }
    
    const totalCalories = weekData.reduce((sum, d) => sum + d.calories, 0)
    const avgCalories = Math.round(totalCalories / 7)
    const targetDays = weekData.filter(d => d.percent >= 80 && d.percent <= 110).length
    
    this.setData({ 
      weekData,
      weekSummary: {
        totalCalories,
        avgCalories,
        targetDays
      }
    })
  },

  getDayName: function(date) {
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return '周' + days[date.getDay()]
  },

  onDateChange: function(e) {
    const date = e.detail.value
    this.setData({
      currentDate: date
    })
    this.loadDailyReport()
  },

  onPrevDay: function() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() - 1)
    this.setData({
      currentDate: formatDate(current)
    })
    this.loadDailyReport()
  },

  onNextDay: function() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() + 1)
    if (current <= new Date()) {
      this.setData({
        currentDate: formatDate(current)
      })
      this.loadDailyReport()
    }
  },

  onTabChange: function(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab })
  },

  onRecordTap: function(e) {
    const { record } = e.currentTarget.dataset
    wx.showActionSheet({
      itemList: ['查看详情', '编辑', '删除'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showRecordDetail(record)
            break
          case 1:
            this.editRecord(record)
            break
          case 2:
            this.deleteRecord(record._id)
            break
        }
      }
    })
  },

  showRecordDetail: function(record) {
    const foods = record.foods || []
    let content = `食物：\n`
    foods.forEach(f => {
      content += `• ${f.name} ${f.estimatedWeight}g\n`
    })
    content += `\n热量：${record.totalCalories} kcal`
    
    wx.showModal({
      title: '记录详情',
      content: content,
      showCancel: false
    })
  },

  editRecord: function(record) {
    wx.navigateTo({
      url: `/pages/recognize/index?recordId=${record._id}`
    })
  },

  deleteRecord: async function(recordId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          const result = await safeApiCall(() => api.food.deleteRecord(recordId))
          if (result.success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadDailyReport()
          }
        }
      }
    })
  },

  getRecommendation: async function() {
    wx.showLoading({ title: '获取建议中...' })
    
    try {
      const { gaps } = this.data
      const result = await safeApiCall(() => api.recommend.getFoodRecommendation(gaps, {}))
      
      wx.hideLoading()
      
      if (result.success && result.suggestions) {
        let content = '饮食建议：\n\n'
        result.suggestions.forEach(s => {
          content += `• ${s.reason}\n`
          content += `  推荐：${s.foods.join('、')}\n\n`
        })
        
        wx.showModal({
          title: '个性化建议',
          content: content,
          showCancel: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '获取建议失败',
        icon: 'none'
      })
    }
  },

  onAddFood: function() {
    wx.switchTab({
      url: '/pages/recognize/index'
    })
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 今日报告',
      path: '/pages/report/index'
    }
  }
})
