/**
 * @fileoverview 小程序全局应用入口文件
 * @description 负责初始化云开发环境、管理全局状态、处理用户登录及生命周期管理
 * @author SmartDiet Team
 * @created 2024-01-01
 */

const { CLOUD_ENV, STORAGE_KEYS } = require('./utils/constants')

/**
 * 小程序全局应用实例
 * 管理应用生命周期、全局数据和方法
 */
App({
  /**
   * 小程序初始化完成时触发（全局只触发一次）
   * @description 初始化云开发环境，检查用户登录状态
   * @returns {void}
   */
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true,
    })
    
    wx.showLoading({ title: '初始化中...', mask: false })
    this.checkLoginStatus()
    setTimeout(() => wx.hideLoading(), 500)
  },

  /**
   * 小程序启动或从后台进入前台时触发
   * @description 应用展示时的处理逻辑
   * @returns {void}
   */
  onShow() {
    // 应用展示时的处理逻辑
  },

  /**
   * 小程序从前台进入后台时触发
   * @description 应用隐藏时的处理逻辑，可在此保存临时数据
   * @returns {void}
   */
  onHide() {
    // 应用隐藏时的处理逻辑
  },

  /**
   * 小程序发生脚本错误或 API 调用失败时触发
   * @description 全局错误处理，可用于错误上报
   * @param {Error} error - 错误对象，包含错误信息和堆栈
   * @returns {void}
   */
  onError(error) {
    console.error('应用发生错误:', error)
    // 可在此进行错误上报
  },

  /**
   * 小程序要打开的页面不存在时触发
   * @description 处理404页面，可重定向到首页或错误页
   * @param {Object} options - 页面不存在时的参数
   * @param {string} options.path - 不存在的页面路径
   * @param {Object} options.query - 打开不存在页面的 query 参数
   * @param {boolean} options.isEntryPage - 是否本次启动的首个页面
   * @returns {void}
   */
  onPageNotFound(options) {
    console.warn('页面不存在:', options.path)
    wx.redirectTo({
      url: '/pages/index/index'
    })
  },

  /**
   * 检查用户登录状态
   * @description 从本地存储读取用户信息，恢复登录状态
   * @returns {void}
   */
  checkLoginStatus() {
    const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO)
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.hasLogin = true
    }
  },

  /**
   * 用户登录
   * @description 调用微信 getUserProfile 获取用户信息并保存到全局数据和本地存储
   * @param {Function} callback - 登录完成后的回调函数
   * @param {boolean} callback.success - 登录是否成功
   * @param {Object} callback.userInfo - 用户信息对象，失败时为 null
   * @param {string} callback.userInfo.nickName - 用户昵称
   * @param {string} callback.userInfo.avatarUrl - 用户头像URL
   * @returns {void}
   */
  login(callback) {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl
        }
        this.globalData.userInfo = userInfo
        this.globalData.hasLogin = true
        wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo)
        callback?.(true, userInfo)
      },
      fail: () => callback?.(false, null)
    })
  },

  /**
   * 全局数据对象
   * @description 存储应用全局共享的数据状态
   * @property {Object|null} userInfo - 用户信息对象
   * @property {boolean} hasLogin - 用户是否已登录
   * @property {string|null} openid - 用户微信openid
   * @property {Object|null} systemInfo - 系统信息
   * @property {Object|null} pendingRecord - 待处理的记录数据
   * @property {boolean} needRefreshReport - 是否需要刷新报告
   */
  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: null,
    systemInfo: null,
    pendingRecord: null,
    needRefreshReport: false
  }
})
