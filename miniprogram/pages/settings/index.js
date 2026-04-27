/**
 * 设置页面 - 管理用户设置与缓存清理
 * @page settings
 * @version 1.0.0
 * @description 提供用户个性化设置管理，包括通知提醒、数据缓存清理、数据导出等功能
 */

const app = getApp()

Page({
  /**
   * 页面数据定义
   * @property {Object} settings - 用户设置对象
   * @property {Boolean} settings.notification - 是否开启消息通知
   * @property {Boolean} settings.reminder - 是否开启每日提醒
   * @property {String} settings.reminderTime - 提醒时间 (HH:mm 格式)
   * @property {Boolean} settings.soundEnabled - 是否开启声音提示
   * @property {Boolean} settings.vibrationEnabled - 是否开启震动反馈
   * @property {String} reminderTimeDisplay - 提醒时间显示文本
   * @property {String} cacheSize - 缓存大小显示文本
   * @property {String} version - 应用版本号
   * @property {Object|null} userInfo - 用户信息对象
   * @property {Boolean} hasLogin - 是否已登录
   */
  data: {
    settings: {
      notification: true,   // 默认开启消息通知
      reminder: true,       // 默认开启每日提醒
      reminderTime: '08:00', // 默认提醒时间为早上 8 点
      soundEnabled: true,   // 默认开启声音
      vibrationEnabled: true // 默认开启震动
    },
    reminderTimeDisplay: '08:00',
    cacheSize: '0 KB',
    version: '1.0.0',
    userInfo: null,
    hasLogin: false
  },

  /**
   * 生命周期函数 - 页面加载
   * @param {Object} options - 页面参数
   * @description 初始化页面，检查登录状态、加载设置、计算缓存大小
   */
  onLoad: function(options) {
    this.checkLogin()      // 检查用户登录状态
    this.loadSettings()    // 从本地存储加载用户设置
    this.calculateCacheSize() // 计算并显示当前缓存大小
  },

  /**
   * 生命周期函数 - 页面显示
   * @description 页面每次显示时重新检查登录状态
   */
  onShow: function() {
    this.checkLogin()
  },

  /**
   * 检查用户登录状态
   * @description 从全局数据获取登录状态和用户信息，并更新到页面数据
   */
  checkLogin: function() {
    const hasLogin = app.globalData.hasLogin
    const userInfo = app.globalData.userInfo
    
    this.setData({
      hasLogin,
      userInfo
    })
  },

  /**
   * 加载用户设置
   * @description 从本地存储读取用户设置，如果不存在则使用默认设置
   */
  loadSettings: function() {
    // 从本地缓存读取设置，如果没有则使用默认值
    const settings = wx.getStorageSync('settings') || this.data.settings
    this.setData({
      settings,
      reminderTimeDisplay: settings.reminderTime
    })
  },

  /**
   * 计算缓存大小
   * @description 获取微信本地存储信息，计算并格式化显示缓存大小
   * @function wx.getStorageInfo 获取本地存储信息
   * @returns {Object} res - 存储信息对象
   * @returns {Number} res.currentSize - 当前已使用空间大小 (KB)
   */
  calculateCacheSize: function() {
    wx.getStorageInfo({
      success: (res) => {
        const size = res.currentSize
        let display = size + ' KB'
        // 如果超过 1MB，转换为 MB 单位显示
        if (size > 1024) {
          display = (size / 1024).toFixed(2) + ' MB'
        }
        this.setData({ cacheSize: display })
      }
    })
  },

  /**
   * 消息通知开关变更处理
   * @param {Object} e - 事件对象
   * @param {Boolean} e.detail.value - 开关值
   * @description 更新消息通知设置并保存到本地存储
   */
  onNotificationChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.notification': value
    })
    this.saveSettings()
  },

  /**
   * 每日提醒开关变更处理
   * @param {Object} e - 事件对象
   * @param {Boolean} e.detail.value - 开关值
   * @description 更新提醒设置，开启时订阅消息模板，关闭时取消提醒
   */
  onReminderChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.reminder': value
    })
    this.saveSettings()
    
    // 根据开关状态设置或取消提醒
    if (value) {
      this.setupReminder()
    } else {
      this.cancelReminder()
    }
  },

  /**
   * 提醒时间变更处理
   * @param {Object} e - 事件对象
   * @param {String} e.detail.value - 选择的时间值 (HH:mm 格式)
   * @description 更新提醒时间并重新设置提醒
   */
  onReminderTimeChange: function(e) {
    const time = e.detail.value
    this.setData({
      'settings.reminderTime': time,
      reminderTimeDisplay: time
    })
    this.saveSettings()
    
    // 如果提醒功能开启，则重新设置提醒
    if (this.data.settings.reminder) {
      this.setupReminder()
    }
  },

  /**
   * 声音提示开关变更处理
   * @param {Object} e - 事件对象
   * @param {Boolean} e.detail.value - 开关值
   * @description 更新声音设置并保存到本地存储
   */
  onSoundChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.soundEnabled': value
    })
    this.saveSettings()
  },

  /**
   * 震动反馈开关变更处理
   * @param {Object} e - 事件对象
   * @param {Boolean} e.detail.value - 开关值
   * @description 更新震动设置并保存到本地存储
   */
  onVibrationChange: function(e) {
    const value = e.detail.value
    this.setData({
      'settings.vibrationEnabled': value
    })
    this.saveSettings()
  },

  /**
   * 设置提醒
   * @description 请求用户订阅消息模板，用于定时提醒
   * @function wx.requestSubscribeMessage 请求订阅消息
   * @todo 需要替换为实际的消息模板 ID
   */
  setupReminder: function() {
    const { reminderTime } = this.data.settings
    const [hour, minute] = reminderTime.split(':')
    
    // 请求用户订阅消息模板
    wx.requestSubscribeMessage({
      tmplIds: ['your_template_id'], // TODO: 替换为实际的消息模板 ID
      success: (res) => {
        console.log('Subscribe message success:', res)
      },
      fail: (err) => {
        console.error('Subscribe message failed:', err)
      }
    })
  },

  /**
   * 取消提醒
   * @description 取消已设置的提醒
   */
  cancelReminder: function() {
    console.log('Cancel reminder')
  },

  /**
   * 保存设置到本地存储
   * @description 将当前设置对象保存到微信本地缓存
   * @function wx.setStorageSync 同步写入本地存储
   */
  saveSettings: function() {
    wx.setStorageSync('settings', this.data.settings)
  },

  /**
   * 清除缓存
   * @description 显示确认对话框，用户确认后清除所有本地存储数据
   * @function wx.showModal 显示确认对话框
   * @function wx.clearStorage 清除所有本地存储数据
   * @function wx.showToast 显示成功提示
   */
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
              // 更新缓存大小显示为 0
              this.setData({ cacheSize: '0 KB' })
              // 重新加载设置
              this.loadSettings()
              
              // 标记需要刷新报告页面
              const app = getApp()
              app.globalData.needRefreshReport = true
            }
          })
        }
      }
    })
  },

  /**
   * 导出数据
   * @description 导出用户饮食记录数据（功能开发中）
   * @function wx.showLoading 显示加载提示
   * @function wx.hideLoading 隐藏加载提示
   * @function wx.showToast 显示提示信息
   */
  exportData: function() {
    wx.showLoading({ title: '导出中...' })
    
    // 模拟导出操作
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }, 500)
  },

  /**
   * 显示关于信息
   * @description 显示应用版本信息和功能介绍
   * @function wx.showModal 显示模态对话框
   */
  showAbout: function() {
    wx.showModal({
      title: '关于 AI 营养师',
      content: `版本：${this.data.version}\n\nAI 营养师是一款智能饮食管理工具，帮助您科学管理日常饮食，实现健康生活目标。\n\n主要功能：\n• 智能食物识别\n• 营养成分分析\n• 个性化饮食建议\n• 健康数据追踪`,
      showCancel: false
    })
  },

  /**
   * 显示意见反馈
   * @description 显示联系方式和反馈渠道
   * @function wx.showModal 显示模态对话框
   */
  showFeedback: function() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系我们：\n\n邮箱：feedback@smartdiet.com',
      showCancel: false
    })
  },

  /**
   * 退出登录
   * @description 清除用户登录状态并跳转到登录页面
   * @function wx.showModal 显示确认对话框
   * @function wx.reLaunch 关闭所有页面，跳转到登录页
   */
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后，您的数据将保留，确定退出吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除全局登录状态
          app.globalData.hasLogin = false
          app.globalData.userInfo = null
          app.globalData.openid = null
          
          // 跳转到登录页面
          wx.reLaunch({
            url: '/pages/login/index'
          })
        }
      }
    })
  },

  /**
   * 阻止触摸移动
   * @returns {Boolean} false - 阻止默认行为
   * @description 用于防止页面滚动等触摸行为
   */
  preventTouchMove: function() {
    return false
  }
})
