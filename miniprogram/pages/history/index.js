/**
 * @fileoverview 历史记录页面
 * 展示最近 30 天的饮食记录，支持按日期筛选、查看、删除记录
 * @module pages/history
 * @version 1.0.0
 * @requires module:utils/formatter
 * @requires module:utils/api
 */

const { formatDate } = require('../../utils/formatter')
const { api, safeApiCall } = require('../../utils/api')

/**
 * 历史记录页面实例
 * @type {Page}
 */
Page({
  /**
   * 页面初始数据
   * @property {Object} data - 页面数据对象
   * @property {Array<Object>} data.records - 按日期分组的记录列表
   * @property {boolean} data.loading - 是否正在加载数据
   * @property {boolean} data.loadingMore - 是否正在加载更多数据
   * @property {boolean} data.hasMore - 是否还有更多数据
   * @property {number} data.page - 当前页码
   * @property {number} data.pageSize - 每页记录数
   * @property {string} data.startDate - 筛选开始日期
   * @property {string} data.endDate - 筛选结束日期
   * @property {boolean} data.showDatePicker - 是否显示日期选择器
   */
  data: {
    records: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 0,
    pageSize: 20,
    startDate: '',
    endDate: '',
    showDatePicker: false
  },

  /**
   * 页面生命周期回调 - 监听页面加载
   * 初始化日期范围并加载记录
   * @param {Object} options - 页面参数
   */
  onLoad: function(options) {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 30)
    
    this.setData({
      endDate: formatDate(today),
      startDate: formatDate(startDate)
    })
    
    this.loadRecords()
  },

  /**
   * 页面生命周期回调 - 监听用户下拉动作
   * 刷新数据并重置分页
   */
  onPullDownRefresh: function() {
    this.setData({
      page: 0,
      records: [],
      hasMore: true
    })
    this.loadRecords().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 页面生命周期回调 - 页面上拉触底事件的处理函数
   * 加载更多数据
   */
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore()
    }
  },

  /**
   * 加载饮食记录
   * 根据日期范围获取历史记录并分组
   * @async
   * @returns {Promise<void>}
   */
  loadRecords: async function() {
    this.setData({ loading: true })
    
    try {
      const { startDate, endDate, page, pageSize } = this.data
      const result = await safeApiCall(() => api.food.getHistory(startDate, endDate))
      
      if (result.success && result.data) {
        const records = this.groupByDate(result.data)
        this.setData({
          records,
          hasMore: result.data.length >= pageSize
        })
      }
    } catch (error) {
      console.error('Load records error:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 加载更多记录
   * 分页加载更多数据
   * @async
   * @returns {Promise<void>}
   */
  loadMore: async function() {
    this.setData({ loadingMore: true })
    
    try {
      const { startDate, endDate, page, pageSize } = this.data
      const newPage = page + 1
      
      const result = await safeApiCall(() => api.food.getHistory(startDate, endDate))
      
      if (result.success && result.data) {
        const newRecords = this.groupByDate(result.data)
        this.setData({
          records: [...this.data.records, ...newRecords],
          page: newPage,
          hasMore: result.data.length >= pageSize
        })
      }
    } catch (error) {
      console.error('Load more error:', error)
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  /**
   * 按日期分组记录
   * 将记录按日期分组并计算每日总热量
   * @param {Array<Object>} records - 原始记录数组
   * @returns {Array<Object>} 分组后的记录数组
   */
  groupByDate: function(records) {
    const grouped = {}
    
    records.forEach(record => {
      const date = record.date
      if (!grouped[date]) {
        grouped[date] = {
          date,
          displayDate: this.formatDisplayDate(date),
          records: []
        }
      }
      
      record.foodsNames = (record.foods || []).map(f => f.name).join('、')
      record.displayTime = this.formatDisplayTime(record.createdAt)
      
      grouped[date].records.push(record)
    })
    
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date))
  },

  /**
   * 格式化显示日期
   * 将日期转换为"今天"、"昨天"或"X月X日"格式
   * @param {string} dateStr - 日期字符串
   * @returns {string} 格式化后的日期显示文本
   */
  formatDisplayDate: function(dateStr) {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateStr === formatDate(today)) {
      return '今天'
    } else if (dateStr === formatDate(yesterday)) {
      return '昨天'
    } else {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    }
  },

  /**
   * 格式化显示时间
   * 将时间戳转换为 HH:mm 格式
   * @param {number|string} timestamp - 时间戳
   * @returns {string} 格式化后的时间字符串
   */
  formatDisplayTime: function(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  },

  /**
   * 日期筛选按钮点击事件
   * 显示日期选择器
   */
  onDateFilter: function() {
    this.setData({ showDatePicker: true })
  },

  /**
   * 开始日期变更事件
   * @param {Object} e - 事件对象
   * @param {string} e.detail.value - 选择的日期
   */
  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
  },

  /**
   * 结束日期变更事件
   * @param {Object} e - 事件对象
   * @param {string} e.detail.value - 选择的日期
   */
  onEndDateChange: function(e) {
    this.setData({ endDate: e.detail.value })
  },

  /**
   * 应用日期筛选
   * 关闭选择器并重新加载数据
   */
  applyDateFilter: function() {
    this.setData({
      showDatePicker: false,
      page: 0,
      records: [],
      hasMore: true
    })
    this.loadRecords()
  },

  /**
   * 取消日期筛选
   * 关闭日期选择器
   */
  cancelDateFilter: function() {
    this.setData({ showDatePicker: false })
  },

  /**
   * 记录项点击事件
   * 显示操作菜单（查看详情、编辑、删除）
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget.dataset - 数据集
   * @param {Object} e.currentTarget.dataset.record - 记录数据
   */
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

  /**
   * 显示记录详情
   * 弹窗展示记录的详细信息
   * @param {Object} record - 记录数据
   * @param {Array<Object>} record.foods - 食物列表
   */
  showRecordDetail: function(record) {
    const foods = record.foods || []
    let content = `食物：\n`
    foods.forEach(f => {
      content += `• ${f.name} ${f.estimatedWeight}g\n`
    })
    content += `\n健康评分：${record.mealOverview?.overallHealthScore || 60} 分`
    
    wx.showModal({
      title: '记录详情',
      content: content,
      showCancel: false
    })
  },

  /**
   * 编辑记录
   * 提示用户暂不支持编辑功能
   * @param {Object} record - 记录数据
   */
  editRecord: function(record) {
    wx.showModal({
      title: '提示',
      content: '暂不支持编辑记录，请删除后重新添加',
      showCancel: false
    })
  },

  /**
   * 删除记录
   * 确认后删除指定记录
   * @async
   * @param {string} recordId - 记录ID
   */
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
            this.setData({
              page: 0,
              records: []
            })
            this.loadRecords()
          }
        }
      }
    })
  },

  /**
   * 添加食物按钮点击事件
   * 跳转到聊天页面
   */
  onAddFood: function() {
    wx.switchTab({
      url: '/pages/chat/index'
    })
  },

  /**
   * 用户点击右上角分享
   * @returns {Object} 分享配置对象
   * @returns {string} return.title - 分享标题
   * @returns {string} return.path - 分享路径
   */
  onShareAppMessage: function() {
    return {
      title: 'AI 营养师 - 历史记录',
      path: '/pages/history/index'
    }
  }
})
