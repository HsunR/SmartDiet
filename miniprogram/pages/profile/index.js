const { formatDate } = require('../../utils/util')
const { USER_GOALS, ACTIVITY_LEVELS, calculateBMR, calculateTDEE, calculateTargetCalories, calculateNutrientTargets } = require('../../utils/constants')
const { api, safeApiCall } = require('../../utils/api')

Page({
  data: {
    userInfo: null,
    hasLogin: false,
    profile: {
      nickname: '',
      avatar: '',
      gender: 0,
      age: 25,
      height: 170,
      weight: 65,
      activityLevel: 3,
      goal: 'maintain'
    },
    stats: {
      totalRecords: 0,
      totalDays: 0,
      avgCalories: 0
    },
    goals: [
      { value: 'lose_weight', label: '减脂' },
      { value: 'maintain', label: '维持' },
      { value: 'gain_muscle', label: '增肌' }
    ],
    activityLevels: [
      { value: 1, label: '久坐' },
      { value: 2, label: '轻度活动' },
      { value: 3, label: '中度活动' },
      { value: 4, label: '活跃' },
      { value: 5, label: '非常活跃' }
    ],
    goalIndex: 1,
    goalLabel: '维持',
    activityIndex: 2,
    activityLabel: '中度活动',
    targets: {
      calories: 2000,
      protein: 75,
      fat: 55,
      carbohydrate: 300
    },
    menuItems: [
      { icon: 'history', title: '历史记录', path: '/pages/history/index' },
      { icon: 'settings', title: '设置', path: '/pages/settings/index' },
      { icon: 'feedback', title: '意见反馈', path: '' },
      { icon: 'about', title: '关于我们', path: '' }
    ]
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    if (this.data.hasLogin) {
      this.loadUserProfile()
      this.loadUserStats()
    }
  },

  checkLogin: function() {
    const app = getApp()
    const hasLogin = app.globalData.hasLogin
    const userInfo = app.globalData.userInfo
    
    this.setData({
      hasLogin,
      userInfo
    })
    
    if (hasLogin) {
      this.loadUserProfile()
      this.loadUserStats()
    }
  },

  loadUserProfile: async function() {
    try {
      const result = await safeApiCall(() => api.user.getProfile())
      
      if (result.success && result.data) {
        const profile = result.data
        this.setData({ profile })
        this.updateSelections()
        this.calculateTargets()
      }
    } catch (error) {
      console.error('Load profile error:', error)
    }
  },

  updateSelections: function() {
    const { profile, goals, activityLevels } = this.data
    
    const goalIndex = goals.findIndex(g => g.value === profile.goal)
    const goalLabel = goalIndex >= 0 ? goals[goalIndex].label : goals[1].label
    
    const activityIndex = activityLevels.findIndex(a => a.value === profile.activityLevel)
    const activityLabel = activityIndex >= 0 ? activityLevels[activityIndex].label : activityLevels[2].label
    
    this.setData({
      goalIndex: goalIndex >= 0 ? goalIndex : 1,
      goalLabel,
      activityIndex: activityIndex >= 0 ? activityIndex : 2,
      activityLabel
    })
  },

  loadUserStats: async function() {
    try {
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
      
      const result = await safeApiCall(() => api.food.getHistory(
        formatDate(startDate),
        formatDate(today)
      ))
      
      if (result.success && result.data) {
        const records = result.data
        const days = new Set(records.map(r => r.date)).size
        const totalCalories = records.reduce((sum, r) => sum + (r.totalCalories || 0), 0)
        
        this.setData({
          stats: {
            totalRecords: records.length,
            totalDays: days,
            avgCalories: days > 0 ? Math.round(totalCalories / days) : 0
          }
        })
      }
    } catch (error) {
      console.error('Load stats error:', error)
    }
  },

  calculateTargets: function() {
    const { profile } = this.data
    const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender)
    const tdee = calculateTDEE(bmr, profile.activityLevel)
    const targetCalories = calculateTargetCalories(tdee, profile.goal)
    const targets = calculateNutrientTargets(targetCalories, profile.goal)
    
    this.setData({ targets })
  },

  onLogin: async function() {
    wx.showLoading({ title: '登录中...' })
    
    try {
      const result = await safeApiCall(() => api.user.login())
      
      if (result.success) {
        const app = getApp()
        app.globalData.hasLogin = true
        app.globalData.userInfo = result.data
        app.globalData.openid = result.openid
        
        this.setData({
          hasLogin: true,
          userInfo: result.data
        })
        
        this.loadUserProfile()
        this.loadUserStats()
      }
    } catch (error) {
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  onGetUserProfile: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        this.updateUserInfo(userInfo)
      }
    })
  },

  updateUserInfo: async function(userInfo) {
    try {
      await safeApiCall(() => api.user.updateInfo(userInfo))
      
      const app = getApp()
      app.globalData.userInfo = userInfo
      
      this.setData({ userInfo })
    } catch (error) {
      console.error('Update user info error:', error)
    }
  },

  onEditProfile: function() {
    wx.navigateTo({
      url: '/pages/settings/index?mode=edit'
    })
  },

  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`profile.${field}`]: field === 'age' || field === 'height' || field === 'weight' 
        ? parseInt(value) || 0 
        : value
    })
  },

  onGenderChange: function(e) {
    const index = e.detail.value
    this.setData({
      'profile.gender': parseInt(index) + 1
    })
  },

  onGoalChange: function(e) {
    const index = e.detail.value
    const { goals } = this.data
    this.setData({
      'profile.goal': goals[index].value,
      goalIndex: parseInt(index),
      goalLabel: goals[index].label
    })
    this.calculateTargets()
  },

  onActivityChange: function(e) {
    const index = e.detail.value
    const { activityLevels } = this.data
    this.setData({
      'profile.activityLevel': activityLevels[index].value,
      activityIndex: parseInt(index),
      activityLabel: activityLevels[index].label
    })
    this.calculateTargets()
  },

  saveProfile: async function() {
    wx.showLoading({ title: '保存中...' })
    
    try {
      const result = await safeApiCall(() => api.user.updateProfile(this.data.profile))
      
      if (result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.calculateTargets()
      }
    } catch (error) {
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  onMenuTap: function(e) {
    const { path } = e.currentTarget.dataset
    if (path) {
      wx.navigateTo({ url: path })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 智能饮食管理助手',
      path: '/pages/chat/index'
    }
  }
})
