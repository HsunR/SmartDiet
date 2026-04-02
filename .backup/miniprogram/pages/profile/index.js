const { formatDate } = require('../../utils/util')
const { api, safeApiCall } = require('../../utils/api')
const { calculateNutrientTargets } = require('../../utils/constants')

Page({
  data: {
    userInfo: null,
    hasLogin: false,
    profile: {
      gender: 1,
      age: 25,
      height: 170,
      weight: 65,
      activityLevel: 3,
      goal: 'maintain'
    },
    stats: {
      totalRecords: 0,
      totalDays: 0,
      avgCalories: 0,
      avgScore: 0,
      streakDays: 0
    },
    goals: [
      { value: 'lose_weight', label: '减脂', icon: '🏃', desc: '控制热量摄入，科学减重' },
      { value: 'maintain', label: '维持', icon: '⚖️', desc: '保持当前体重，均衡营养' },
      { value: 'gain_muscle', label: '增肌', icon: '💪', desc: '增加蛋白质摄入，增强肌肉' }
    ],
    activityLevels: [
      { value: 1, label: '久坐', desc: '很少运动' },
      { value: 2, label: '轻度活动', desc: '每周运动1-2次' },
      { value: 3, label: '中度活动', desc: '每周运动3-4次' },
      { value: 4, label: '活跃', desc: '每周运动5-6次' },
      { value: 5, label: '非常活跃', desc: '每天运动' }
    ],
    goalIndex: 1,
    activityIndex: 2,
    targets: {
      calories: 2000,
      protein: 75,
      fat: 55,
      carbohydrate: 300
    },
    showGoalPicker: false,
    showActivityPicker: false
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
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

  loadUserStats: async function() {
    try {
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      
      const result = await safeApiCall(() => 
        api.food.getHistory(formatDate(thirtyDaysAgo), formatDate(today))
      )
      
      if (result.success && result.data) {
        const records = result.data
        const uniqueDays = new Set(records.map(r => r.date))
        const totalCalories = records.reduce((sum, r) => sum + (r.totalCalories || 0), 0)
        const totalScore = records.reduce((sum, r) => sum + (r.mealOverview?.overallHealthScore || 60), 0)
        
        const streakDays = this.calculateStreakDays(records)
        
        this.setData({
          stats: {
            totalRecords: records.length,
            totalDays: uniqueDays.size,
            avgCalories: records.length > 0 ? Math.round(totalCalories / records.length) : 0,
            avgScore: records.length > 0 ? Math.round(totalScore / records.length) : 0,
            streakDays
          }
        })
      }
    } catch (error) {
      console.error('Load stats error:', error)
    }
  },

  calculateStreakDays: function(records) {
    if (!records || records.length === 0) return 0
    
    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date))
    const today = formatDate(new Date())
    
    let streak = 0
    let currentDate = new Date()
    
    for (let i = 0; i < 30; i++) {
      const dateStr = formatDate(currentDate)
      const hasRecord = sortedRecords.some(r => r.date === dateStr)
      
      if (hasRecord) {
        streak++
      } else if (i > 0) {
        break
      }
      
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    return streak
  },

  updateSelections: function() {
    const { profile, goals, activityLevels } = this.data
    
    const goalIndex = goals.findIndex(g => g.value === profile.goal)
    const activityIndex = activityLevels.findIndex(a => a.value === profile.activityLevel)
    
    this.setData({
      goalIndex: goalIndex >= 0 ? goalIndex : 1,
      activityIndex: activityIndex >= 0 ? activityIndex : 2
    })
  },

  calculateTargets: function() {
    const { profile } = this.data
    const targets = calculateNutrientTargets(profile)
    this.setData({ targets })
  },

  onLogin: function() {
    const app = getApp()
    app.login((success, userInfo) => {
      if (success) {
        this.setData({
          hasLogin: true,
          userInfo
        })
        this.loadUserProfile()
        this.loadUserStats()
      }
    })
  },

  onGetUserProfile: function() {
    if (this.data.getUserProfileLock) {
      return
    }
    
    this.setData({ getUserProfileLock: true })
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        this.setData({ 
          getUserProfileLock: false,
          userInfo: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          }
        })
        this.updateUserInfo({
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        })
      },
      fail: () => {
        this.setData({ getUserProfileLock: false })
      }
    })
  },

  updateUserInfo: async function(userInfo) {
    try {
      await safeApiCall(() => api.user.updateInfo(userInfo))
      
      const app = getApp()
      app.globalData.userInfo = { ...app.globalData.userInfo, ...userInfo }
    } catch (error) {
      console.error('Update user info error:', error)
    }
  },

  onGenderChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      'profile.gender': index + 1
    })
    this.calculateTargets()
  },

  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`profile.${field}`]: field === 'age' || field === 'height' || field === 'weight' 
        ? parseInt(value) || 0 
        : value
    })
    
    if (['age', 'height', 'weight'].includes(field)) {
      this.calculateTargets()
    }
  },

  showGoalPicker: function() {
    this.setData({ showGoalPicker: true })
  },

  hideGoalPicker: function() {
    this.setData({ showGoalPicker: false })
  },

  onGoalSelect: function(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      goalIndex: index,
      'profile.goal': this.data.goals[index].value,
      showGoalPicker: false
    })
    this.calculateTargets()
  },

  showActivityPicker: function() {
    this.setData({ showActivityPicker: true })
  },

  hideActivityPicker: function() {
    this.setData({ showActivityPicker: false })
  },

  onActivitySelect: function(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      activityIndex: index,
      'profile.activityLevel': this.data.activityLevels[index].value,
      showActivityPicker: false
    })
    this.calculateTargets()
  },

  saveProfile: async function() {
    wx.showLoading({ title: '保存中...' })
    
    try {
      await safeApiCall(() => api.user.updateProfile(this.data.profile))
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('Save profile error:', error)
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
    }
  },

  preventTouchMove: function() {
    return false
  }
})
