const { formatDate } = require('../../utils/util')
const { api, safeApiCall } = require('../../utils/api')

Page({
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

  onLoad: function() {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 30)
    
    this.setData({
      endDate: formatDate(today),
      startDate: formatDate(startDate)
    })
    
    this.loadRecords()
  },

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

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore()
    }
  },

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

  groupByDate: function(records) {
    const grouped = {}
    
    records.forEach(record => {
      const date = record.date
      if (!grouped[date]) {
        grouped[date] = {
          date,
          displayDate: this.formatDisplayDate(date),
          records: [],
          totalCalories: 0
        }
      }
      grouped[date].records.push(record)
      grouped[date].totalCalories += record.totalCalories || 0
    })
    
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date))
  },

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

  onDateFilter: function() {
    this.setData({ showDatePicker: true })
  },

  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
  },

  onEndDateChange: function(e) {
    this.setData({ endDate: e.detail.value })
  },

  applyDateFilter: function() {
    this.setData({
      showDatePicker: false,
      page: 0,
      records: [],
      hasMore: true
    })
    this.loadRecords()
  },

  cancelDateFilter: function() {
    this.setData({ showDatePicker: false })
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

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 历史记录',
      path: '/pages/history/index'
    }
  }
})
