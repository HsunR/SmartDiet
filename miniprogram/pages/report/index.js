const { formatDate } = require('../../utils/util')
const { api, safeApiCall } = require('../../utils/api')

const CACHE_KEY = 'report_cache'
const CACHE_DURATION = 5 * 60 * 1000

Page({
  data: {
    currentDate: '',
    weekRange: '',
    weekDays: [],
    calendarData: {},
    weekSummary: {
      totalCalories: 0,
      avgCalories: 0,
      mealCount: 0,
      dailyAvgCalories: []
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
    currentRecords: [],
    isEditing: false,
    editFoods: []
  },

  onLoad: function() {
    const today = new Date()
    this.setData({
      currentDate: formatDate(today)
    })
    this.initWeekDays(today)
    
    const hasCache = this.loadCachedData()
    if (!hasCache) {
      this.loadWeekData()
    }
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
    
    const app = getApp()
    if (app.globalData.needRefreshReport) {
      app.globalData.needRefreshReport = false
      this.clearCache()
      this.loadWeekData()
    }
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
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = formatDate(d)
      weekDays.push({
        date: dateStr,
        dayName: '周' + dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: dateStr === formatDate(new Date())
      })
    }
    
    this.setData({
      weekDays,
      weekRange: `${startDate.slice(5)} ~ ${formatDate(endDate).slice(5)}`
    })
  },

  loadWeekData: async function() {
    this.setData({ loading: true })
    
    try {
      const { weekDays } = this.data
      const calendarData = {}
      let totalCalories = 0
      let mealCount = 0
      const dailyCalories = {}
      
      for (const day of weekDays) {
        calendarData[day.date] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: []
        }
        dailyCalories[day.date] = { total: 0, count: 0 }
        
        try {
          const result = await safeApiCall(() => api.food.getRecords(day.date))
          
          if (result.success && result.data) {
            const records = result.data
            
            records.forEach(record => {
              const mealType = record.mealType || 'snack'
              const mealOverview = record.mealOverview || {}
              const foods = record.foods || []
              
              const recordData = {
                _id: record._id,
                imageUrl: record.imageUrl || (foods[0]?.imageUrl),
                foods: foods.map(food => ({
                  name: food.name || '',
                  calories: food.calories || food.totalCalories || 0,
                  weight: food.weight || food.estimatedWeight || 0,
                  category: food.category || '',
                  advice: food.advice || '',
                  tags: food.tags || (food.tags && (food.tags.positive || food.tags.warning) ? [...(food.tags.positive || []), ...(food.tags.warning || [])] : [])
                })),
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
              dailyCalories[day.date].total += record.totalCalories || 0
              dailyCalories[day.date].count++
            })
          }
        } catch (e) {
          console.error('Load records error:', e)
        }
      }
      
      const dailyAvgCalories = weekDays.map(day => {
        const dayData = dailyCalories[day.date]
        return {
          date: day.date,
          dayName: day.dayName,
          calories: dayData.count > 0 ? Math.round(dayData.total / dayData.count) : 0,
          isToday: day.isToday
        }
      })
      
      const avgCalories = mealCount > 0 ? Math.round(totalCalories / 7) : 0
      
      const maxCalories = Math.max(...dailyAvgCalories.map(d => d.calories), 100)
      
      const weekSummary = {
        totalCalories,
        avgCalories,
        mealCount,
        dailyAvgCalories,
        maxCalories: Math.ceil(maxCalories / 100) * 100
      }
      
      this.setData({
        calendarData,
        weekSummary
      })
      
      this.saveCache(calendarData, weekSummary)
      
      setTimeout(() => {
        this.scrollToToday()
      }, 300)
      
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
      currentRecords: records,
      isEditing: false,
      editFoods: []
    })
  },

  onSwiperChange: function(e) {
    const index = e.detail.current
    const { currentRecords } = this.data
    if (currentRecords[index]) {
      this.setData({
        currentRecordIndex: index,
        detailData: currentRecords[index],
        isEditing: false
      })
    }
  },

  onPrevRecord: function() {
    const { currentRecordIndex, currentRecords } = this.data
    if (currentRecordIndex > 0) {
      this.setData({
        currentRecordIndex: currentRecordIndex - 1,
        detailData: currentRecords[currentRecordIndex - 1],
        isEditing: false
      })
    }
  },

  onNextRecord: function() {
    const { currentRecordIndex, currentRecords } = this.data
    if (currentRecordIndex < currentRecords.length - 1) {
      this.setData({
        currentRecordIndex: currentRecordIndex + 1,
        detailData: currentRecords[currentRecordIndex + 1],
        isEditing: false
      })
    }
  },

  closeDetailModal: function() {
    this.setData({
      showDetailModal: false,
      detailData: null,
      currentRecords: [],
      isEditing: false,
      editFoods: []
    })
  },

  toggleEdit: function() {
    const { isEditing, detailData } = this.data
    if (!isEditing) {
      this.setData({
        isEditing: true,
        editFoods: JSON.parse(JSON.stringify(detailData.foods || []))
      })
    } else {
      this.setData({ isEditing: false })
    }
  },

  onEditFoodName: function(e) {
    const { index } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`editFoods[${index}].name`]: value
    })
  },

  onEditFoodCalories: function(e) {
    const { index } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    this.setData({
      [`editFoods[${index}].calories`]: value
    })
  },

  onEditFoodWeight: function(e) {
    const { index } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    this.setData({
      [`editFoods[${index}].weight`]: value
    })
  },

  saveEdit: async function() {
    const { detailData, editFoods, currentRecordIndex, currentRecords } = this.data
    
    wx.showLoading({ title: '保存中...' })
    
    try {
      const totalCalories = editFoods.reduce((sum, food) => sum + (food.calories || 0), 0)
      
      const updateData = {
        foods: editFoods,
        totalCalories
      }
      
      await safeApiCall(() => api.food.updateRecord(detailData._id, updateData))
      
      const updatedRecord = {
        ...detailData,
        foods: editFoods,
        totalCalories
      }
      
      currentRecords[currentRecordIndex] = updatedRecord
      
      this.setData({
        detailData: updatedRecord,
        currentRecords,
        isEditing: false
      })
      
      this.clearCache()
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('Save edit error:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  promptAddRecord: function(date, meal) {
    const mealTypeLabel = this.data.mealTypes.find(m => m.type === meal)?.label || '餐次'
    
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

  navigateToChat: function() {
    wx.switchTab({
      url: '/pages/chat/index'
    })
  },

  preventTouchMove: function() {
    return false
  },

  loadCachedData: function() {
    try {
      const cached = wx.getStorageSync(CACHE_KEY)
      if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
        const { calendarData, weekSummary, weekDays } = cached
        if (calendarData && weekSummary && weekDays) {
          this.setData({
            calendarData,
            weekSummary,
            weekDays,
            loading: false
          })
          
          setTimeout(() => {
            this.scrollToToday()
          }, 300)
          
          return true
        }
      }
    } catch (e) {
      console.error('Load cache error:', e)
    }
    return false
  },

  saveCache: function(calendarData, weekSummary) {
    try {
      const cache = {
        calendarData,
        weekSummary,
        weekDays: this.data.weekDays,
        timestamp: Date.now()
      }
      wx.setStorageSync(CACHE_KEY, cache)
    } catch (e) {
      console.error('Save cache error:', e)
    }
  },

  clearCache: function() {
    try {
      wx.removeStorageSync(CACHE_KEY)
    } catch (e) {
      console.error('Clear cache error:', e)
    }
  },

  scrollToToday: function() {
    const { weekDays } = this.data
    const todayStr = formatDate(new Date())
    let todayIndex = -1
  
    // 1. 查找今日索引（这部分是对的，保留）
    for (let i = 0; i < weekDays.length; i++) {
      if (weekDays[i].date === todayStr) {
        todayIndex = i
        break
      }
    }
    if (todayIndex === -1) return
    // 🔥 核心修复：等DOM渲染完成，再获取真实宽度计算
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this)
      
      // 2. 获取 左侧固定栏 真实宽度（px）
      query.select('.meal-type-header').boundingClientRect()
      // 3. 获取 日期单元格 真实宽度（px）
      query.select('.day-cell').boundingClientRect()
      // 4. 获取 滚动容器 真实宽度（px）
      query.select('.calendar-scroll').boundingClientRect()
  
      query.exec((res) => {
        // 拿不到DOM元素，直接退出
        if (!res[0] || !res[1] || !res[2]) return

        const mealTypeWidth = res[0].width    // 左侧栏真实宽度
        const cellWidth = res[1].width        // 日期格子真实宽度
        const scrollWidth = res[2].width     // 滚动容器可视宽度
  
        // 5. 计算精准滚动偏移量（全用px，无硬编码）
        const todayCellLeft = mealTypeWidth + todayIndex * cellWidth
        const todayCellCenter = todayCellLeft + cellWidth / 2
        const targetCenter = scrollWidth / 2
        let scrollLeft = todayCellCenter - targetCenter
  
        // 6. 边界限制（防止滚动越界）
        const totalWidth = mealTypeWidth + weekDays.length * cellWidth
        const maxScrollLeft = Math.max(0, totalWidth - scrollWidth)
        scrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft))
  
        // 7. 赋值滚动
        this.setData({ scrollLeft })
      })
    })
  },

  calculateLineAngle: function(index, data, maxCalories) {
    if (!data || index >= data.length - 1) return 0
    
    const current = data[index].calories / maxCalories * 100
    const next = data[index + 1].calories / maxCalories * 100
    
    const deltaY = next - current
    const deltaX = 100
    
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    return angle
  },

  calculateLineWidth: function(index, data, maxCalories) {
    if (!data || index >= data.length - 1) return 0
    
    const current = data[index].calories / maxCalories * 100
    const next = data[index + 1].calories / maxCalories * 100
    
    const deltaY = Math.abs(next - current)
    const deltaX = 100
    
    const width = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    return width
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 本周报告',
      path: '/pages/report/index'
    }
  }
})
