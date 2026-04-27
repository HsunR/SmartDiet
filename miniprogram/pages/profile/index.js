/**
 * @fileoverview 个人中心页面
 * 用户个人资料管理，支持登录、查看和编辑个人资料、查看统计数据
 * @module pages/profile
 * @version 1.0.0
 * @requires module:utils/formatter
 * @requires module:utils/api
 * @requires module:utils/calculator
 */

const { formatDate } = require('../../utils/formatter')
const { api, safeApiCall } = require('../../utils/api')
const { calculateNutrientTargets } = require('../../utils/calculator')

/**
 * 个人中心页面实例
 * @type {Page}
 */
Page({
  /**
   * 页面初始数据
   * @property {Object} data - 页面数据对象
   * @property {Object|null} data.userInfo - 用户信息（微信授权）
   * @property {boolean} data.hasLogin - 是否已登录
   * @property {Object} data.profile - 个人资料
   * @property {number} data.profile.gender - 性别：1-男，2-女
   * @property {number} data.profile.age - 年龄（岁）
   * @property {number} data.profile.height - 身高（cm）
   * @property {number} data.profile.weight - 体重（kg）
   * @property {number} data.profile.activityLevel - 活动水平：1-久坐，2-轻度活动，3-中度活动，4-活跃，5-非常活跃
   * @property {string} data.profile.goal - 健康目标：lose_weight-减脂，maintain-维持，gain_muscle-增肌
   * @property {Object} data.stats - 统计数据
   * @property {number} data.stats.totalRecords - 总记录次数
   * @property {number} data.stats.totalDays - 总记录天数
   * @property {number} data.stats.avgCalories - 平均每餐热量
   * @property {number} data.stats.avgScore - 平均健康评分
   * @property {number} data.stats.streakDays - 连续记录天数
   * @property {Array<Object>} data.goals - 健康目标选项
   * @property {Array<Object>} data.activityLevels - 活动水平选项
   * @property {number} data.goalIndex - 当前选中的健康目标索引
   * @property {number} data.activityIndex - 当前选中的活动水平索引
   * @property {Object} data.targets - 营养目标
   * @property {boolean} data.showGoalPicker - 是否显示健康目标选择器
   * @property {boolean} data.showActivityPicker - 是否显示活动水平选择器
   */
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
      { value: 2, label: '轻度活动', desc: '每周运动 1-2 次' },
      { value: 3, label: '中度活动', desc: '每周运动 3-4 次' },
      { value: 4, label: '活跃', desc: '每周运动 5-6 次' },
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

  /**
   * 页面生命周期回调 - 监听页面加载
   * @param {Object} options - 页面参数
   */
  onLoad: function(options) {
    this.checkLogin()
  },

  /**
   * 页面生命周期回调 - 监听页面显示
   * 设置底部导航栏选中状态并加载数据
   */
  onShow: function() {
    // 设置底部导航栏选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
    // 如果已登录，加载用户资料和统计数据
    if (this.data.hasLogin) {
      this.loadUserProfile()
      this.loadUserStats()
    }
  },

  /**
   * 检查登录状态
   * 从全局数据获取登录状态并更新页面数据
   */
  checkLogin: function() {
    const app = getApp()
    const hasLogin = app.globalData.hasLogin
    const userInfo = app.globalData.userInfo
    
    this.setData({
      hasLogin,
      userInfo
    })
    
    // 如果已登录，加载用户资料和统计数据
    if (hasLogin) {
      this.loadUserProfile()
      this.loadUserStats()
    }
  },

  /**
   * 加载用户资料
   * 从服务器获取用户个人资料
   * @async
   * @returns {Promise<void>}
   */
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

  /**
   * 加载用户统计数据
   * 计算最近30天的饮食统计数据
   * @async
   * @returns {Promise<void>}
   */
  loadUserStats: async function() {
    try {
      // 获取最近 30 天的日期范围
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      
      const result = await safeApiCall(() => 
        api.food.getHistory(formatDate(thirtyDaysAgo), formatDate(today))
      )
      
      if (result.success && result.data) {
        const records = result.data
        const uniqueDays = new Set(records.map(r => r.date))
        const totalScore = records.reduce((sum, r) => sum + (r.mealOverview?.overallHealthScore || 60), 0)
        
        const streakDays = this.calculateStreakDays(records)
        
        this.setData({
          stats: {
            totalRecords: records.length,
            totalDays: uniqueDays.size,
            avgScore: records.length > 0 ? Math.round(totalScore / records.length) : 0,
            streakDays
          }
        })
      }
    } catch (error) {
      console.error('Load stats error:', error)
    }
  },

  /**
   * 计算连续记录天数
   * 从今天往前推算连续有记录的天数
   * @param {Array<Object>} records - 饮食记录数组
   * @returns {number} 连续记录天数
   */
  calculateStreakDays: function(records) {
    if (!records || records.length === 0) return 0
    
    // 按日期降序排序
    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date))
    const today = formatDate(new Date())
    
    let streak = 0
    let currentDate = new Date()
    
    // 从今天开始往前推算 30 天
    for (let i = 0; i < 30; i++) {
      const dateStr = formatDate(currentDate)
      const hasRecord = sortedRecords.some(r => r.date === dateStr)
      
      if (hasRecord) {
        streak++
      } else if (i > 0) {
        // 如果中间某天没有记录，则中断
        break
      }
      
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    return streak
  },

  /**
   * 更新选择器选中状态
   * 根据当前profile更新目标索引和活动水平索引
   */
  updateSelections: function() {
    const { profile, goals, activityLevels } = this.data
    
    // 查找当前目标和活动水平的索引
    const goalIndex = goals.findIndex(g => g.value === profile.goal)
    const activityIndex = activityLevels.findIndex(a => a.value === profile.activityLevel)
    
    this.setData({
      goalIndex: goalIndex >= 0 ? goalIndex : 1,
      activityIndex: activityIndex >= 0 ? activityIndex : 2
    })
  },

  /**
   * 计算营养目标
   * 根据用户资料计算每日营养目标
   */
  calculateTargets: function() {
    const { profile } = this.data
    const targets = calculateNutrientTargets(profile)
    this.setData({ targets })
  },

  /**
   * 用户登录
   * 调用App登录方法
   */
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

  /**
   * 获取用户头像和昵称
   * 调用微信 getUserProfile 接口
   */
  onGetUserProfile: function() {
    // 防止重复点击
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

  /**
   * 更新用户信息
   * @async
   * @param {Object} userInfo - 用户信息
   * @param {string} userInfo.nickName - 用户昵称
   * @param {string} userInfo.avatarUrl - 用户头像URL
   * @returns {Promise<void>}
   */
  updateUserInfo: async function(userInfo) {
    try {
      await safeApiCall(() => api.user.updateInfo(userInfo))
      
      // 更新全局用户信息
      const app = getApp()
      app.globalData.userInfo = { ...app.globalData.userInfo, ...userInfo }
    } catch (error) {
      console.error('Update user info error:', error)
    }
  },

  /**
   * 性别改变事件
   * @param {Object} e - 事件对象
   * @param {number} e.detail.value - 选中的索引
   */
  onGenderChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      'profile.gender': index + 1
    })
    this.calculateTargets()
  },

  /**
   * 输入框改变事件（年龄、身高、体重）
   * @param {Object} e - 事件对象
   * @param {string} e.currentTarget.dataset.field - 字段名
   * @param {string} e.detail.value - 输入值
   */
  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`profile.${field}`]: field === 'age' || field === 'height' || field === 'weight' 
        ? parseInt(value) || 0 
        : value
    })
    
    // 如果是身体数据变化，重新计算营养目标
    if (['age', 'height', 'weight'].includes(field)) {
      this.calculateTargets()
    }
  },

  /**
   * 显示健康目标选择器
   */
  showGoalPicker: function() {
    this.setData({ showGoalPicker: true })
  },

  /**
   * 隐藏健康目标选择器
   */
  hideGoalPicker: function() {
    this.setData({ showGoalPicker: false })
  },

  /**
   * 选择健康目标
   * @param {Object} e - 事件对象
   * @param {number} e.currentTarget.dataset.index - 选项索引
   */
  onGoalSelect: function(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      goalIndex: index,
      'profile.goal': this.data.goals[index].value,
      showGoalPicker: false
    })
    this.calculateTargets()
  },

  /**
   * 显示活动水平选择器
   */
  showActivityPicker: function() {
    this.setData({ showActivityPicker: true })
  },

  /**
   * 隐藏活动水平选择器
   */
  hideActivityPicker: function() {
    this.setData({ showActivityPicker: false })
  },

  /**
   * 选择活动水平
   * @param {Object} e - 事件对象
   * @param {number} e.currentTarget.dataset.index - 选项索引
   */
  onActivitySelect: function(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      activityIndex: index,
      'profile.activityLevel': this.data.activityLevels[index].value,
      showActivityPicker: false
    })
    this.calculateTargets()
  },

  /**
   * 保存个人资料
   * 将用户资料保存到服务器
   * @async
   * @returns {Promise<void>}
   */
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

  /**
   * 菜单项点击事件
   * @param {Object} e - 事件对象
   * @param {string} e.currentTarget.dataset.path - 页面路径
   */
  onMenuTap: function(e) {
    const { path } = e.currentTarget.dataset
    if (path) {
      wx.navigateTo({ url: path })
    }
  },

  /**
   * 阻止触摸移动
   * 用于弹窗阻止页面滚动
   * @returns {boolean} 返回false阻止默认行为
   */
  preventTouchMove: function() {
    return false
  }
})
