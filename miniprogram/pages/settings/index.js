const app = getApp()

Page({
  data: {
    settings: {
      notification: true,
      reminder: true,
      reminderTime: '08:00',
      darkMode: false,
      language: 'zh-CN'
    },
    reminderTimeDisplay: '08:00',
    cacheSize: '0 KB',
    version: '1.0.0'
  },

  onLoad: function(options) {
    this.loadSettings()
    this.calculateCacheSize()
  },

  loadSettings: function() {
    const settings = wx.getStorageSync('settings') || this.data.settings
    this.setData({
      settings,
      reminderTimeDisplay: settings.reminderTime
    })
  },

  calculateCacheSize: function() {
    wx.getStorageInfo({
      success: (res) => {
        const size = res.currentSize
        let display = size + ' KB'
        if (size > 1024) {
          display = (size / 1024).toFixed(2) + ' MB'
        }
        this.setData({ cacheSize: display })
      }
    })
  },

  onNotificationChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.notification': value
    })
    this.saveSettings()
  },

  onReminderChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.reminder': value
    })
    this.saveSettings()
    
    if (value) {
      this.setupReminder()
    } else {
      this.cancelReminder()
    }
  },

  onReminderTimeChange: function(e) {
    const time = e.detail.value
    this.setData({
      'settings.reminderTime': time,
      reminderTimeDisplay: time
    })
    this.saveSettings()
    
    if (this.data.settings.reminder) {
      this.setupReminder()
    }
  },

  setupReminder: function() {
    const { reminderTime } = this.data.settings
    const [hour, minute] = reminderTime.split(':').map(Number)
    
    wx.requestSubscribeMessage({
      tmplIds: ['your-template-id'],
      success: (res) => {
        console.log('Subscribe success:', res)
      }
    })
  },

  cancelReminder: function() {
    wx.removeStorageSync('reminderTask')
  },

  onDarkModeChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.darkMode': value
    })
    this.saveSettings()
  },

  saveSettings: function() {
    wx.setStorageSync('settings', this.data.settings)
  },

  clearCache: function() {
    wx.showModal({
      title: '确认清除',
      content: '清除缓存后，部分数据需要重新加载，确定清除吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({
                title: '清除成功',
                icon: 'success'
              })
              this.setData({ cacheSize: '0 KB' })
              this.loadSettings()
            }
          })
        }
      }
    })
  },

  exportData: async function() {
    wx.showLoading({ title: '导出中...' })
    
    try {
      const db = wx.cloud.database()
      const records = await db.collection('food_records').where({
        _openid: app.globalData.openid
      }).get()
      
      if (records.data.length > 0) {
        const exportData = {
          exportDate: new Date().toISOString(),
          records: records.data
        }
        
        wx.setClipboardData({
          data: JSON.stringify(exportData, null, 2),
          success: () => {
            wx.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
          }
        })
      } else {
        wx.showToast({
          title: '暂无数据可导出',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  feedback: function() {
    wx.showModal({
      title: '意见反馈',
      content: '请通过以下方式联系我们：\n邮箱：feedback@smartdiet.com',
      showCancel: false
    })
  },

  showAbout: function() {
    wx.showModal({
      title: '关于AI营养师',
      content: `版本：${this.data.version}\n\nAI营养师是一款智能饮食管理工具，帮助您科学管理日常饮食，实现健康生活目标。`,
      showCancel: false
    })
  },

  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后，您的数据将保留，确定退出吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.hasLogin = false
          app.globalData.userInfo = null
          app.globalData.openid = null
          
          wx.reLaunch({
            url: '/pages/login/index'
          })
        }
      }
    })
  }
})
