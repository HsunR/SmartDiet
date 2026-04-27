/**
 * 用户引导页面 - 首次使用引导用户填写基本信息
 * 包含性别、年龄、身高、体重、活动水平和健康目标
 * @page onboarding
 * @version 1.0.0
 */

const { api, safeApiCall } = require('../../utils/api')
const app = getApp()

Page({
  /**
   * 页面数据
   */
  data: {
    currentStep: 0,    // 当前步骤索引
    /**
     * 引导步骤配置
     * @type {Array<Object>}
     */
    steps: [
      {
        type: 'gender',                    // 性别选择
        title: '您的性别',
        subtitle: '这将帮助我们更准确地计算您的营养需求'
      },
      {
        type: 'number',                    // 数字输入（年龄）
        title: '您的年龄',
        subtitle: '年龄会影响基础代谢率的计算',
        field: 'age',
        min: 10,
        max: 100,
        default: 25,
        unit: '岁'
      },
      {
        type: 'number',                    // 数字输入（身高）
        title: '您的身高',
        subtitle: '身高是计算基础代谢的重要参数',
        field: 'height',
        min: 100,
        max: 250,
        default: 170,
        unit: 'cm'
      },
      {
        type: 'number',                    // 数字输入（体重）
        title: '您的体重',
        subtitle: '体重将用于计算每日所需热量',
        field: 'weight',
        min: 30,
        max: 200,
        default: 65,
        unit: 'kg'
      },
      {
        type: 'activity',                  // 活动水平选择
        title: '活动水平',
        subtitle: '请选择最符合您日常活动情况的选项'
      },
      {
        type: 'goal',                      // 健康目标选择
        title: '您的目标',
        subtitle: '我们会根据您的目标制定个性化建议'
      }
    ],
    /**
     * 用户档案数据
     * @type {Object}
     */
    profile: {
      gender: null,           // 性别（1 男，2 女）
      age: 25,                // 年龄
      height: 170,            // 身高（cm）
      weight: 65,             // 体重（kg）
      activityLevel: 3,       // 活动水平（1-5）
      goal: 'maintain'        // 健康目标
    },
    /**
     * 活动水平选项
     * @type {Array<Object>}
     */
    activityLevels: [
      { value: 1, label: '久坐', desc: '几乎不运动，办公室工作', icon: '🪑' },
      { value: 2, label: '轻度活动', desc: '每周运动1-2次', icon: '🚶' },
      { value: 3, label: '中度活动', desc: '每周运动3-4次', icon: '🏃' },
      { value: 4, label: '活跃', desc: '每周运动5-6次', icon: '💪' },
      { value: 5, label: '非常活跃', desc: '每天高强度运动', icon: '🔥' }
    ],
    /**
     * 健康目标选项
     * @type {Array<Object>}
     */
    goals: [
      { value: 'lose_weight', label: '减脂', desc: '减少体脂，塑造线条', icon: '📉' },
      { value: 'maintain', label: '维持', desc: '保持当前体重和健康', icon: '⚖️' },
      { value: 'gain_muscle', label: '增肌', desc: '增加肌肉量，提升力量', icon: '📈' }
    ]
  },

  /**
   * 页面生命周期回调 - 监听页面加载
   * 加载用户已有的档案数据
   */
  onLoad: function() {
    this.loadExistingProfile()
  },

  /**
   * 加载用户已有的档案信息
   * 如果用户之前已完成引导，则加载其数据
   */
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

  /**
   * 性别选择事件处理
   * @param {Object} e - 事件对象
   */
  onGenderSelect: function(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      'profile.gender': gender
    })
    // 选择后自动进入下一步
    setTimeout(() => {
      this.onNextStep()
    }, 300)
  },

  /**
   * 滑块变化完成事件处理
   * @param {Object} e - 事件对象
   */
  onSliderChange: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`profile.${field}`]: value
    })
  },

  /**
   * 滑块变化中事件处理（实时更新）
   * @param {Object} e - 事件对象
   */
  onSliderChanging: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`profile.${field}`]: value
    })
  },

  /**
   * 活动水平选择事件处理
   * @param {Object} e - 事件对象
   */
  onActivitySelect: function(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      'profile.activityLevel': value
    })
  },

  /**
   * 健康目标选择事件处理
   * @param {Object} e - 事件对象
   */
  onGoalSelect: function(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      'profile.goal': value
    })
  },

  /**
   * 上一步按钮点击事件
   */
  onPrevStep: function() {
    const { currentStep } = this.data
    if (currentStep > 0) {
      this.setData({
        currentStep: currentStep - 1
      })
    }
  },

  /**
   * 下一步按钮点击事件
   * 如果是最后一步则保存档案
   */
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

  /**
   * 保存用户档案到云端
   * 保存成功后跳转到聊天页
   */
  saveProfile: async function() {
    wx.showLoading({ title: '保存中...' })
    
    try {
      const { profile } = this.data
      
      const result = await safeApiCall(() => api.user.updateProfile(profile))
      
      if (result.success) {
        wx.hideLoading()
        
        // 更新全局用户信息
        app.globalData.userInfo = {
          ...app.globalData.userInfo,
          ...profile,
          hasCompletedOnboarding: true
        }
        
        // 持久化到本地
        wx.setStorageSync('userInfo', app.globalData.userInfo)
        wx.setStorageSync('hasCompletedOnboarding', true)
        
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })
        
        // 跳转到聊天页面
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
