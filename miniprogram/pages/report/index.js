/**
 * @fileoverview 饮食报告页面
 * 展示本周饮食统计和趋势分析，包含日历视图、折线图、详细记录和编辑功能
 * @module pages/report
 * @version 1.0.0
 * @requires module:utils/formatter
 * @requires module:utils/api
 */

const { formatDate } = require('../../utils/formatter')
const { api, safeApiCall } = require('../../utils/api')
const { API_BASE_URL } = require('../../utils/constants')

// 服务器基础URL（用于拼接图片路径）
const SERVER_BASE_URL = API_BASE_URL.replace('/api/v1', '')

/**
 * 缓存键名
 * @constant {string}
 */
const CACHE_KEY = 'report_cache'

/**
 * 缓存时长：5 分钟
 * @constant {number}
 */
const CACHE_DURATION = 5 * 60 * 1000

/**
 * 饮食报告页面实例
 * @type {Page}
 */
Page({
  /**
   * 页面初始数据
   * @property {Object} data - 页面数据对象
   * @property {string} data.currentDate - 当前日期
   * @property {string} data.weekRange - 本周日期范围
   * @property {Array<Object>} data.weekDays - 本周七天日期数组
   * @property {Object} data.calendarData - 日历数据
   * @property {Object} data.weekSummary - 本周统计摘要
   * @property {number} data.weekSummary.avgScore - 本周平均评分
   * @property {number} data.weekSummary.mealCount - 本周餐次数量
   * @property {Array<Object>} data.weekSummary.dailyAvgScore - 每日平均评分数组
   * @property {boolean} data.loading - 是否正在加载
   * @property {number} data.scrollLeft - 横向滚动位置
   * @property {Array<Object>} data.mealTypes - 餐次类型配置
   * @property {boolean} data.showDetailModal - 是否显示详情弹窗
   * @property {Object|null} data.detailData - 详情数据
   * @property {string} data.detailDate - 详情日期
   * @property {string} data.detailMealType - 详情餐次类型
   * @property {number} data.currentRecordIndex - 当前记录索引
   * @property {number} data.totalRecords - 总记录数
   * @property {Array<Object>} data.currentRecords - 当前记录列表
   * @property {boolean} data.isEditing - 是否编辑模式
   * @property {Array<Object>} data.editFoods - 编辑中的食物列表
   */
  data: {
    currentDate: '',
    weekRange: '',
    weekDays: [],
    calendarData: {},
    weekSummary: {
      avgScore: 0,
      mealCount: 0,
      dailyAvgScore: []
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

  /**
   * 页面生命周期回调 - 监听页面加载
   * 初始化日期并加载数据
   * @param {Object} options - 页面参数
   */
  onLoad: function(options) {
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

  /**
   * 页面生命周期回调 - 监听页面显示
   * 设置底部导航栏状态并处理刷新标记
   */
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

  /**
   * 页面生命周期回调 - 监听用户下拉动作
   * 刷新本周数据
   */
  onPullDownRefresh: function() {
    this.loadWeekData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 初始化本周七天的日期数据
   * 根据指定日期计算所在周的七天日期
   * @param {Date} date - 任意日期，用于确定所在周
   */
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

  /**
   * 加载本周饮食数据
   * 遍历七天查询每天的饮食记录并计算统计
   * @async
   * @returns {Promise<void>}
   */
  loadWeekData: async function() {
    this.setData({ loading: true })
    
    try {
      const { weekDays } = this.data
      const calendarData = {}
      let mealCount = 0
      const dailyScores = {}
      
      for (const day of weekDays) {
        calendarData[day.date] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: []
        }
        dailyScores[day.date] = { total: 0, count: 0 }
        
        try {
          const result = await safeApiCall(() => api.food.getRecords(day.date))
          
          if (result.success && result.data) {
            const records = result.data
            
            records.forEach(record => {
              const mealType = record.mealType || 'snack'
              const mealOverview = record.mealOverview || {}
              const foods = record.foods || []
              
              const recordData = {
                _id: record.id,
                imageFileID: record.imageUrl || '',
                imageUrl: record.imageUrl || '',
                foods: foods.map(food => {
                  const foodTags = food.tags || { positive: [], warning: [] }
                  return {
                    name: food.name || '',
                    score: food.score || 60,
                    estimatedWeight: food.estimatedWeight || food.weight || 0,
                    category: food.category || '',
                    advice: food.advice || '',
                    tags: foodTags,
                    tagReasons: food.tagReasons || {},
                    imageUrl: food.imageUrl && food.imageUrl.startsWith('cloud://') ? food.imageUrl : null
                  }
                }),
                healthTags: mealOverview.healthTags || { positive: [], warning: [] },
                rating: record.rating || 0,
                mealOverview: {
                  overallHealthScore: mealOverview.overallHealthScore || 60,
                  healthTags: mealOverview.healthTags || { positive: [], warning: [] },
                  summary: mealOverview.summary || '',
                  tagReasons: mealOverview.tagReasons || {}
                },
                dietaryAdvice: record.dietaryAdvice || ''
              }
              
              calendarData[day.date][mealType].push(recordData)
              
              mealCount++
              dailyScores[day.date].total += mealOverview.overallHealthScore || 60
              dailyScores[day.date].count++
            })
          }
        } catch (e) {
          console.error('Load records error:', e)
        }
      }
      
      const dailyAvgScore = weekDays.map(day => {
        const dayData = dailyScores[day.date]
        return {
          date: day.date,
          dayName: day.dayName,
          score: dayData.count > 0 ? Math.round(dayData.total / dayData.count) : 0,
          isToday: day.isToday
        }
      })
      
      const totalScore = dailyAvgScore.reduce((sum, d) => sum + d.score, 0)
      const avgScore = mealCount > 0 ? Math.round(totalScore / dailyAvgScore.filter(d => d.score > 0).length) : 0
      
      const weekSummary = {
        avgScore,
        mealCount,
        dailyAvgScore
      }
      
      // 批量刷新日历中的图片URL
      const refreshedCalendarData = await this.refreshCalendarImageUrls(calendarData)
      
      this.setData({
        calendarData: refreshedCalendarData,
        weekSummary
      })
      
      this.saveCache(refreshedCalendarData, weekSummary)
      
      setTimeout(() => {
        this.scrollToToday()
      }, 300)
      
    } catch (error) {
      console.error('Load week data error:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 日期变更事件
   * @param {Object} e - 事件对象
   * @param {string} e.detail.value - 选择的日期
   */
  onDateChange: function(e) {
    const date = e.detail.value
    this.setData({
      currentDate: date
    })
    this.initWeekDays(new Date(date))
    this.loadWeekData()
  },

  /**
   * 上一周按钮点击事件
   */
  onPrevWeek: function() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() - 7)
    this.setData({
      currentDate: formatDate(current)
    })
    this.initWeekDays(current)
    this.loadWeekData()
  },

  /**
   * 下一周按钮点击事件
   */
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

  /**
   * 获取评分星星显示
   * @param {number} rating - 评分值
   * @returns {string} 星星字符串
   */
  getRatingStars: function(rating) {
    if (rating === 0) return '❓'
    return '⭐'.repeat(rating)
  },

  /**
   * 日历单元格点击事件
   * @param {Object} e - 事件对象
   * @param {string} e.currentTarget.dataset.date - 日期
   * @param {string} e.currentTarget.dataset.meal - 餐次类型
   */
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

  /**
   * 显示记录详情
   * @param {string} date - 日期
   * @param {string} meal - 餐次类型
   * @param {Array<Object>} records - 记录列表
   */
  showRecordDetail: async function(date, meal, records) {
    const mealTypeLabel = this.data.mealTypes.find(m => m.type === meal)?.label || '详情'
    
    // 刷新图片URL（临时URL可能已过期）
    const refreshedRecords = await this.refreshImageUrls(records)
    
    this.setData({
      showDetailModal: true,
      detailData: refreshedRecords[0],
      detailDate: date,
      detailMealType: mealTypeLabel,
      currentRecordIndex: 0,
      totalRecords: refreshedRecords.length,
      currentRecords: refreshedRecords,
      isEditing: false,
      editFoods: []
    })
  },

  /**
   * 刷新记录中的图片URL
   * 云存储临时URL有过期时间，需要在显示前重新获取
   * @param {Array<Object>} records - 记录列表
   * @returns {Promise<Array<Object>>} 刷新后的记录列表
   */
  refreshImageUrls: async function(records) {
    return records.map(record => {
      let imageUrl = record.imageUrl
      // 将相对路径转换为完整URL
      if (imageUrl && imageUrl.startsWith('/uploads/')) {
        imageUrl = SERVER_BASE_URL + imageUrl
      }
      return { ...record, imageUrl }
    })
  },

  refreshCalendarImageUrls: async function(calendarData) {
    const result = {}
    for (const date in calendarData) {
      result[date] = {}
      for (const mealType in calendarData[date]) {
        result[date][mealType] = calendarData[date][mealType].map(record => {
          let imageUrl = record.imageUrl
          // 将相对路径转换为完整URL
          if (imageUrl && imageUrl.startsWith('/uploads/')) {
            imageUrl = SERVER_BASE_URL + imageUrl
          }
          return { ...record, imageUrl }
        })
      }
    }
    return result
  },

  /**
   * 切换到下一条记录
   */
  onNextRecord: function() {
    const { currentRecordIndex, currentRecords } = this.data
    if (currentRecordIndex < currentRecords.length - 1) {
      const newIndex = currentRecordIndex + 1
      this.setData({
        currentRecordIndex: newIndex,
        detailData: currentRecords[newIndex],
        isEditing: false
      })
    }
  },

  /**
   * 切换到上一条记录
   */
  onPrevRecord: function() {
    const { currentRecordIndex, currentRecords } = this.data
    if (currentRecordIndex > 0) {
      const newIndex = currentRecordIndex - 1
      this.setData({
        currentRecordIndex: newIndex,
        detailData: currentRecords[newIndex],
        isEditing: false
      })
    }
  },



  /**
   * 关闭详情弹窗
   */
  closeDetailModal: function() {
    this.setData({
      showDetailModal: false,
      detailData: null,
      currentRecords: [],
      isEditing: false,
      editFoods: []
    })
  },

  /**
   * 切换编辑模式
   */
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

  /**
   * 编辑食物名称
   * @param {Object} e - 事件对象
   * @param {number} e.currentTarget.dataset.index - 食物索引
   * @param {string} e.detail.value - 输入值
   */
  onEditFoodName: function(e) {
    const { index } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`editFoods[${index}].name`]: value
    })
  },

  /**
   * 编辑食物热量
   * @param {Object} e - 事件对象
   * @param {number} e.currentTarget.dataset.index - 食物索引
   * @param {string} e.detail.value - 输入值
   */
  onEditFoodScore: function(e) {
    const { index } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    this.setData({
      [`editFoods[${index}].score`]: value
    })
  },

  /**
   * 编辑食物重量
   * @param {Object} e - 事件对象
   * @param {number} e.currentTarget.dataset.index - 食物索引
   * @param {string} e.detail.value - 输入值
   */
  onEditFoodWeight: function(e) {
    const { index } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    this.setData({
      [`editFoods[${index}].weight`]: value
    })
  },

  /**
   * 保存编辑
   * 将编辑后的食物数据保存到服务器
   * @async
   * @returns {Promise<void>}
   */
  saveEdit: async function() {
    const { detailData, editFoods, currentRecordIndex, currentRecords } = this.data
    
    wx.showLoading({ title: '保存中...' })
    
    try {
      const avgScore = editFoods.length > 0
        ? Math.round(editFoods.reduce((sum, food) => sum + (food.score || 60), 0) / editFoods.length)
        : 60
      
      const updateData = {
        foods: editFoods
      }
      
      await safeApiCall(() => api.food.updateRecord(detailData._id, updateData))
      
      const updatedRecord = {
        ...detailData,
        foods: editFoods,
        mealOverview: {
          ...detailData.mealOverview,
          overallHealthScore: avgScore
        }
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

  /**
   * 提示添加记录
   * @param {string} date - 日期
   * @param {string} meal - 餐次类型
   */
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

  /**
   * 带参数跳转到聊天页面
   * @param {string} date - 日期
   * @param {string} meal - 餐次类型
   */
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

  /**
   * 跳转到聊天页面
   */
  navigateToChat: function() {
    wx.switchTab({
      url: '/pages/chat/index'
    })
  },

  /**
   * 阻止触摸移动
   * @returns {boolean} 返回false阻止默认行为
   */
  preventTouchMove: function() {
    return false
  },

  /**
   * 加载缓存数据
   * @returns {boolean} 是否成功加载缓存
   */
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

  /**
   * 保存缓存
   * @param {Object} calendarData - 日历数据
   * @param {Object} weekSummary - 周统计摘要
   */
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

  /**
   * 清除缓存
   */
  clearCache: function() {
    try {
      wx.removeStorageSync(CACHE_KEY)
    } catch (e) {
      console.error('Clear cache error:', e)
    }
  },

  /**
   * 滚动到今天位置
   */
  scrollToToday: function() {
    const { weekDays } = this.data
    const todayStr = formatDate(new Date())
    let todayIndex = -1
  
    // 查找今日索引
    for (let i = 0; i < weekDays.length; i++) {
      if (weekDays[i].date === todayStr) {
        todayIndex = i
        break
      }
    }
    if (todayIndex === -1) return
    // 等DOM渲染完成，再获取真实宽度计算
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this)
      
      // 获取左侧固定栏真实宽度（px）
      query.select('.meal-type-header').boundingClientRect()
      // 获取日期单元格真实宽度（px）
      query.select('.day-cell').boundingClientRect()
      // 获取滚动容器真实宽度（px）
      query.select('.calendar-scroll').boundingClientRect()
  
      query.exec((res) => {
        // 拿不到DOM元素，直接退出
        if (!res[0] || !res[1] || !res[2]) return

        const mealTypeWidth = res[0].width    // 左侧栏真实宽度
        const cellWidth = res[1].width        // 日期格子真实宽度
        const scrollWidth = res[2].width     // 滚动容器可视宽度
  
        // 计算精准滚动偏移量（全用px，无硬编码）
        const todayCellLeft = mealTypeWidth + todayIndex * cellWidth
        const todayCellCenter = todayCellLeft + cellWidth / 2
        const targetCenter = scrollWidth / 2
        let scrollLeft = todayCellCenter - targetCenter
  
        // 边界限制（防止滚动越界）
        const totalWidth = mealTypeWidth + weekDays.length * cellWidth
        const maxScrollLeft = Math.max(0, totalWidth - scrollWidth)
        scrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft))
  
        // 赋值滚动
        this.setData({ scrollLeft })
      })
    })
  },

  /**
   * 计算折线图线段的角度
   * 使用反正切函数计算两点连线的旋转角度
   * @param {number} index - 当前数据点索引
   * @param {Array<Object>} data - 每日热量数据数组
   * @param {number} maxCalories - 最大热量值（用于归一化）
   * @returns {number} 线段旋转角度（度）
   */
  calculateLineAngle: function(index, data, maxScore) {
    if (!data || index >= data.length - 1) return 0
    
    const current = data[index].score / maxScore * 100
    const next = data[index + 1].score / maxScore * 100
    
    const deltaY = next - current
    const deltaX = 100
    
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    return angle
  },

  /**
   * 计算折线图线段的长度
   * 使用勾股定理计算两点间的距离
   * @param {number} index - 当前数据点索引
   * @param {Array<Object>} data - 每日评分数据数组
   * @param {number} maxScore - 最大评分值（用于归一化）
   * @returns {number} 线段长度（rpx）
   */
  calculateLineWidth: function(index, data, maxScore) {
    if (!data || index >= data.length - 1) return 0
    
    const current = data[index].score / maxScore * 100
    const next = data[index + 1].score / maxScore * 100
    
    const deltaY = Math.abs(next - current)
    const deltaX = 100
    
    const width = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    return width
  },

  /**
   * 用户点击右上角分享
   * @returns {Object} 分享配置对象
   * @returns {string} return.title - 分享标题
   * @returns {string} return.path - 分享路径
   */
  onShareAppMessage: function() {
    return {
      title: 'AI 营养师 - 智能饮食管理助手',
      path: '/pages/chat/index'
    }
  }
})