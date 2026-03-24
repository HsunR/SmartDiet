const { api, safeApiCall } = require('../../utils/api')
const app = getApp()

Page({
  data: {
    currentStep: 0,
    steps: [
      {
        type: 'gender',
        title: '您的性别',
        subtitle: '这将帮助我们更准确地计算您的营养需求'
      },
      {
        type: 'number',
        title: '您的年龄',
        subtitle: '年龄会影响基础代谢率的计算',
        field: 'age',
        min: 10,
        max: 100,
        default: 25,
        unit: '岁'
      },
      {
        type: 'number',
        title: '您的身高',
        subtitle: '身高是计算基础代谢的重要参数',
        field: 'height',
        min: 100,
        max: 250,
        default: 170,
        unit: 'cm'
      },
      {
        type: 'number',
        title: '您的体重',
        subtitle: '体重将用于计算每日所需热量',
        field: 'weight',
        min: 30,
        max: 200,
        default: 65,
        unit: 'kg'
      },
      {
        type: 'activity',
        title: '活动水平',
        subtitle: '请选择最符合您日常活动情况的选项'
      },
      {
        type: 'goal',
        title: '您的目标',
        subtitle: '我们会根据您的目标制定个性化建议'
      }
    ],
    profile: {
      gender: 1,
      age: 25,
      height: 170,
      weight: 65,
      activityLevel: 3,
      goal: 'maintain'
    },
    activityLevels: [
      { value: 1, label: '久坐', desc: '几乎不运动，办公室工作', icon: '🪑' },
      { value: 2, label: '轻度活动', desc: '每周运动1-2次', icon: '🚶' },
      { value: 3, label: '中度活动', desc: '每周运动3-4次', icon: '🏃' },
      { value: 4, label: '活跃', desc: '每周运动5-6次', icon: '💪' },
      { value: 5, label: '非常活跃', desc: '每天高强度运动', icon: '🔥' }
    ],
    goals: [
      { value: 'lose_weight', label: '减脂', desc: '减少体脂，塑造线条', icon: '📉' },
      { value: 'maintain', label: '维持', desc: '保持当前体重和健康', icon: '⚖️' },
      { value: 'gain_muscle', label: '增肌', desc: '增加肌肉量，提升力量', icon: '📈' }
    ]
  },

  onLoad: function() {
    this.loadExistingProfile()
  },

  loadExistingProfile: async function() {
    try {
      const result = await safeApiCall(() => api.user.getProfile())
      
      if (result.success && result.data) {
        const profile = result.data
        this.setData({
          profile: {
            gender: profile.gender || 1,
            age: profile.age || 25,
            height: profile.height || 170,
            weight: profile.weight || 65,
            activityLevel: profile.activityLevel || 3,
            goal: profile.goal || 'maintain'
          }
        })
      }
    } catch (error) {
      console.error('Load profile error:', error)
    }
  },

  onGenderSelect: function(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      'profile.gender': gender
    })
  },

  onSliderChange: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`profile.${field}`]: value
    })
  },

  onActivitySelect: function(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      'profile.activityLevel': value
    })
  },

  onGoalSelect: function(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      'profile.goal': value
    })
  },

  onPrevStep: function() {
    const { currentStep } = this.data
    if (currentStep > 0) {
      this.setData({
        currentStep: currentStep - 1
      })
    }
  },

  onNextStep: async function() {
    const { currentStep, steps, profile } = this.data
    
    if (currentStep < steps.length - 1) {
      this.setData({
        currentStep: currentStep + 1
      })
    } else {
      await this.saveProfile()
    }
  },

  saveProfile: async function() {
    wx.showLoading({ title: '保存中...' })
    
    try {
      const { profile } = this.data
      
      const result = await safeApiCall(() => api.user.updateProfile(profile))
      
      if (result.success) {
        wx.hideLoading()
        
        app.globalData.userInfo = {
          ...app.globalData.userInfo,
          ...profile
        }
        
        wx.setStorageSync('userInfo', app.globalData.userInfo)
        
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/chat/index'
          })
        }, 1500)
      } else {
        throw new Error(result.error || '保存失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('Save profile error:', error)
      
      wx.showModal({
        title: '保存失败',
        content: '网络错误，请重试',
        showCancel: false
      })
    }
  }
})
