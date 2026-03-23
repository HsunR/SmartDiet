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
    gaps: [],
    loading: true,
    activeTab: 'overview',
    tabs: [
      { key: 'overview', name: '概览' },
      { key: 'detail', name: '详情' },
      { key: 'trend', name: '趋势' }
    ],
    weekData: [],
    mealRecords: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
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
        
        this.setData({
          records,
          mealRecords,
          summary
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
        
        weekData.push({
          date: dateStr,
          day: this.getDayName(date),
          calories: summary.calories,
          target: this.data.targets.calories
        })
      } catch (error) {
        weekData.push({
          date: dateStr,
          day: this.getDayName(date),
          calories: 0,
          target: this.data.targets.calories
        })
      }
    }
    
    this.setData({ weekData })
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

  getProgressPercent: function(current, target) {
    return Math.min(Math.round((current / target) * 100), 150)
  },

  getProgressColor: function(percent) {
    if (percent < 50) return '#FF9800'
    if (percent <= 100) return '#4CAF50'
    if (percent <= 110) return '#FF9800'
    return '#F44336'
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

  onAddFood: function() {
    wx.switchTab({
      url: '/pages/recognize/index'
    })
  },

  getRecommendation: async function() {
    wx.showLoading({ title: '生成建议中...' })
    
    try {
      const result = await safeApiCall(() => api.recommend.getFoodRecommendation(this.data.gaps, {}))
      
      if (result.success && result.suggestions) {
        this.showRecommendationModal(result.suggestions)
      }
    } catch (error) {
      wx.showToast({
        title: '获取建议失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  showRecommendationModal: function(suggestions) {
    let content = ''
    suggestions.forEach((s, i) => {
      content += `${i + 1}. ${s.nutrient}：${s.foods.join('、')}\n`
    })
    
    wx.showModal({
      title: '饮食建议',
      content: content,
      showCancel: false
    })
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 今日饮食报告',
      path: '/pages/report/index'
    }
  }
})
