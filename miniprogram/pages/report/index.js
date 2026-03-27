const { formatDate } = require('../../utils/util')
const { api, safeApiCall } = require('../../utils/api')

Page({
  data: {
    currentDate: '',
    weekRange: '',
    weekDays: [],
    calendarData: {},
    weekSummary: {
      totalCalories: 0,
      avgCalories: 0,
      mealCount: 0
    },
    loading: true,
    scrollLeft: 0,
    mealTypes: [
      { type: 'breakfast', label: '早餐', icon: '🌅' },
      { type: 'lunch', label: '午餐', icon: '☀️' },
      { type: 'dinner', label: '晚餐', icon: '🌙' },
      { type: 'snack', label: '其他', icon: '🍎' }
    ],
    showDetailModal: false,
    detailData: null,
    detailDate: '',
    detailMealType: '',
    currentRecordIndex: 0,
    totalRecords: 1,
    currentRecords: []
  },

  onLoad: function() {
    const today = new Date()
    this.setData({
      currentDate: formatDate(today)
    })
    this.initWeekDays(today)
    this.loadWeekData()
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
    this.loadWeekData()
  },

  onPullDownRefresh: function() {
    this.loadWeekData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  initWeekDays: function(date) {
    const weekDays = []
    const dayNames = ['日', '一', '二', '三', '四', '五', '六']
    const current = new Date(date)
    const dayOfWeek = current.getDay()
    const monday = new Date(current)
    monday.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    
    const startDate = formatDate(monday)
    const endDate = new Date(monday)
    endDate.setDate(monday.getDate() + 6)
    
    let todayIndex = 0
    const todayStr = formatDate(new Date())
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = formatDate(d)
      if (dateStr === todayStr) {
        todayIndex = i
      }
      weekDays.push({
        date: dateStr,
        dayName: '周' + dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr
      })
    }
    
    const cellWidth = 200
    const mealTypeWidth = 120
    const screenWidth = 750
    const todayCellCenter = mealTypeWidth + todayIndex * cellWidth + cellWidth / 2
    const targetPosition = (mealTypeWidth + screenWidth) / 2
    let scrollLeft = todayCellCenter - targetPosition
    
    const totalWidth = mealTypeWidth + 7 * cellWidth
    const maxScrollLeft = Math.max(0, totalWidth - screenWidth)
    scrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft))
    
    this.setData({
      weekDays,
      weekRange: `${startDate.slice(5)} ~ ${formatDate(endDate).slice(5)}`,
      scrollLeft
    })
  },

  loadWeekData: async function() {
    this.setData({ loading: true })
    
    try {
      const { weekDays } = this.data
      const calendarData = {}
      let totalCalories = 0
      let mealCount = 0
      
      for (const day of weekDays) {
        calendarData[day.date] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: []
        }
        
        try {
          const result = await safeApiCall(() => api.food.getRecords(day.date))
          
          if (result.success && result.data) {
            const records = result.data
            
            records.forEach(record => {
              const mealType = record.mealType || 'snack'
              const mealOverview = record.mealOverview || {}
              
              const recordData = {
                _id: record._id,
                imageUrl: record.imageUrl || (record.foods && record.foods[0]?.imageUrl),
                foods: record.foods || [],
                totalCalories: record.totalCalories || 0,
                healthTags: mealOverview.healthTags || { positive: [], warning: [] },
                rating: record.rating || 0,
                mealOverview: {
                  overallHealthScore: mealOverview.overallHealthScore || 60,
                  totalCalories: mealOverview.totalCalories || record.totalCalories || 0,
                  healthTags: mealOverview.healthTags || { positive: [], warning: [] },
                  summary: mealOverview.summary || ''
                },
                dietaryAdvice: record.dietaryAdvice || ''
              }
              
              calendarData[day.date][mealType].push(recordData)
              
              totalCalories += record.totalCalories || 0
              mealCount++
            })
          }
        } catch (e) {
          console.error('Load records error:', e)
        }
      }
      
      const avgCalories = mealCount > 0 ? Math.round(totalCalories / 7) : 0
      
      this.setData({
        calendarData,
        weekSummary: {
          totalCalories,
          avgCalories,
          mealCount
        }
      })
      
    } catch (error) {
      console.error('Load week data error:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  onDateChange: function(e) {
    const date = e.detail.value
    this.setData({
      currentDate: date
    })
    this.initWeekDays(new Date(date))
    this.loadWeekData()
  },

  onPrevWeek: function() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() - 7)
    this.setData({
      currentDate: formatDate(current)
    })
    this.initWeekDays(current)
    this.loadWeekData()
  },

  onNextWeek: function() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() + 7)
    if (current <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      this.setData({
        currentDate: formatDate(current)
      })
      this.initWeekDays(current)
      this.loadWeekData()
    }
  },

  getRatingStars: function(rating) {
    if (rating === 0) return '❓'
    return '⭐'.repeat(rating)
  },

  onCellTap: function(e) {
    const { date, meal } = e.currentTarget.dataset
    const { calendarData } = this.data
    const cellRecords = calendarData[date]?.[meal]
    
    if (cellRecords && cellRecords.length > 0) {
      this.showRecordDetail(date, meal, cellRecords)
    } else {
      this.promptAddRecord(date, meal)
    }
  },

  showRecordDetail: function(date, meal, records) {
    const mealTypeLabel = this.data.mealTypes.find(m => m.type === meal)?.label || '详情'
    
    this.setData({
      showDetailModal: true,
      detailData: records[0],
      detailDate: date,
      detailMealType: mealTypeLabel,
      currentRecordIndex: 0,
      totalRecords: records.length,
      currentRecords: records
    })
  },

  onPrevRecord: function() {
    const { currentRecordIndex, currentRecords } = this.data
    if (currentRecordIndex > 0) {
      this.setData({
        currentRecordIndex: currentRecordIndex - 1,
        detailData: currentRecords[currentRecordIndex - 1]
      })
    }
  },

  onNextRecord: function() {
    const { currentRecordIndex, currentRecords } = this.data
    if (currentRecordIndex < currentRecords.length - 1) {
      this.setData({
        currentRecordIndex: currentRecordIndex + 1,
        detailData: currentRecords[currentRecordIndex + 1]
      })
    }
  },

  closeDetailModal: function() {
    this.setData({
      showDetailModal: false,
      detailData: null,
      currentRecords: []
    })
  },

  onDetailSwiperChange: function(e) {
    this.setData({
      currentRecordIndex: e.detail.current
    })
  },

  promptAddRecord: function(date, meal) {
    const mealTypeLabel = this.data.mealTypes.find(m => m.type === meal)?.label || '餐次'
    const today = formatDate(new Date())
    const isToday = date === today
    
    wx.showModal({
      title: '添加记录',
      content: `是否要添加${date}的${mealTypeLabel}记录？`,
      success: (res) => {
        if (res.confirm) {
          this.navigateToChatWithParams(date, meal)
        }
      }
    })
  },

  navigateToChatWithParams: function(date, meal) {
    const app = getApp()
    app.globalData.pendingRecord = {
      date: date,
      mealType: meal
    }
    
    wx.switchTab({
      url: '/pages/chat/index'
    })
  },

  preventTouchMove: function() {
    return false
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 本周报告',
      path: '/pages/report/index'
    }
  }
})
