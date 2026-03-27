const app = getApp()

Page({
  data: {
    settings: {
      notification: true,
      reminder: true,
      reminderTime: '08:00',
      soundEnabled: true,
      vibrationEnabled: true
    },
    reminderTimeDisplay: '08:00',
    cacheSize: '0 KB',
    version: '1.0.0',
    userInfo: null,
    hasLogin: false
  },

  onLoad: function(options) {
    this.checkLogin()
    this.loadSettings()
    this.calculateCacheSize()
  },

  onShow: function() {
    this.checkLogin()
  },

  checkLogin: function() {
    const hasLogin = app.globalData.hasLogin
    const userInfo = app.globalData.userInfo
    
    this.setData({
      hasLogin,
      userInfo
    })
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

  onSoundChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.soundEnabled': value
    })
    this.saveSettings()
  },

  onVibrationChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.vibrationEnabled': value
    })
    this.saveSettings()
  },

  setupReminder: function() {
    const { reminderTime } = this.data.settings
    const [hour, minute] = reminderTime.split(':')
    
    wx.requestSubscribeMessage({
      tmplIds: ['your_template_id'],
      success: (res) => {
        console.log('Subscribe message success:', res)
      },
      fail: (err) => {
        console.error('Subscribe message failed:', err)
      }
    })
  },

  cancelReminder: function() {
    console.log('Cancel reminder')
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
              
              const app = getApp()
              app.globalData.needRefreshReport = true
            }
          })
        }
      }
    })
  },

  exportData: function() {
    wx.showLoading({ title: '导出中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }, 500)
  },

  showAbout: function() {
    wx.showModal({
      title: '关于AI营养师',
      content: `版本：${this.data.version}\n\nAI营养师是一款智能饮食管理工具，帮助您科学管理日常饮食，实现健康生活目标。\n\n主要功能：\n• 智能食物识别\n• 营养成分分析\n• 个性化饮食建议\n• 健康数据追踪`,
      showCancel: false
    })
  },

  showFeedback: function() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系我们：\n\n邮箱：feedback@smartdiet.com',
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
  },

  preventTouchMove: function() {
    return false
  }
})
