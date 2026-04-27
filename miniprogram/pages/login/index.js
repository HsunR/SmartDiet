/**
 * 登录页面 - 用户登录和云环境初始化
 * 提供微信登录和错误处理功能
 * @page login
 * @version 1.0.0
 */

const app = getApp()

Page({
  /**
   * 页面数据
   */
  data: {
    loading: true,       // 是否正在加载
    userInfo: null,      // 用户信息
    cloudReady: false    // 云环境是否就绪
  },

  /**
   * 页面生命周期回调 - 监听页面加载
   * 初始化云开发环境
   */
  onLoad: function() {
    this.initCloud()
  },

  /**
   * 初始化云开发环境
   * 检测基础库版本并初始化云服务
   */
  initCloud: async function() {
    try {
      // 检查基础库是否支持云开发
      if (!wx.cloud) {
        this.setData({
          loading: false,
          cloudReady: false
        })
        return
      }
      
      // 初始化云环境
      await wx.cloud.init({
        env: 'cloud1-5g94ikff8709bdba',
        traceUser: true
      })
      
      this.setData({
        loading: false,
        cloudReady: true
      })
      
      this.checkLogin()
      
    } catch (error) {
      console.error('Cloud init error:', error)
      this.setData({
        loading: false,
        cloudReady: false
      })
    }
  },

  /**
   * 检查用户登录状态
   * 如果已登录则直接跳转到聊天页
   */
  checkLogin: function() {
    if (app.globalData.hasLogin) {
      wx.switchTab({
        url: '/pages/chat/index'
      })
    }
  },

  /**
   * 用户登录处理函数
   * 调用云函数进行用户登录/注册
   */
  onLogin: async function() {
    if (!this.data.cloudReady) {
      wx.showModal({
        title: '云环境未就绪',
        content: '请检查云开发环境配置是否正确',
        showCancel: false
      })
      return
    }
    
    wx.showLoading({ title: '登录中...' })
    
    try {
      const loginResult = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'login' }
      })
      
      console.log('Login result:', loginResult)
      
      if (loginResult.errMsg === 'cloud.callFunction:ok' && loginResult.result) {
        const result = loginResult.result
        
        if (result.success) {
          // 设置全局登录状态
          app.globalData.hasLogin = true
          app.globalData.openid = result.openid
          
          if (result.data) {
            app.globalData.userInfo = result.data
            wx.setStorageSync('userInfo', result.data)
          }
          
          wx.hideLoading()
          
          // 根据用户资料完整性跳转到不同页面
          if (result.data && result.data.age && result.data.height && result.data.weight) {
            // 资料完整，进入聊天页
            wx.switchTab({
              url: '/pages/chat/index'
            })
          } else {
            // 资料不完整，进入引导页
            wx.redirectTo({
              url: '/pages/onboarding/index'
            })
          }
          return
        }
        
        // 数据库集合不存在，提示用户初始化
        if (result.needInit) {
          wx.hideLoading()
          wx.showModal({
            title: '需要初始化',
            content: '数据库集合不存在，请前往云开发控制台创建 users 集合',
            confirmText: '去控制台',
            showCancel: false,
            success: () => {
              wx.showModal({
                title: '提示',
                content: '请在微信开发者工具中：云开发控制台 -> 数据库 -> 添加集合 -> 输入 users',
                showCancel: false
              })
            }
          })
          return
        }
        
        throw new Error(result.error || '云函数返回错误')
      }
      
      throw new Error('云函数调用失败')
      
    } catch (error) {
      console.error('Login error:', error)
      wx.hideLoading()
      
      let errorMsg = '登录失败，请重试'
      
      // 错误类型判断和提示
      if (error.errMsg) {
        if (error.errMsg.includes('not deployed') || error.errMsg.includes('FunctionName')) {
          errorMsg = '云函数未部署，请右键 cloudfunctions/user 文件夹选择"上传并部署"'
        } else if (error.errMsg.includes('timeout')) {
          errorMsg = '网络超时，请检查网络'
        } else if (error.errMsg.includes('env')) {
          errorMsg = '云环境配置错误，请检查 app.js 中的 env 配置'
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      
      wx.showModal({
        title: '登录失败',
        content: errorMsg,
        showCancel: false,
        confirmText: '重试'
      })
    }
  },

  /**
   * 获取用户头像和昵称
   * 调用微信 getUserProfile 接口
   */
  onGetUserProfile: function() {
    if (this.data.getUserProfileLock) {
      return
    }
    
    this.setData({ getUserProfileLock: true })
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          getUserProfileLock: false
        })
        this.onLogin()
      },
      fail: () => {
        this.setData({ getUserProfileLock: false })
        this.onLogin()
      }
    })
  },

})
