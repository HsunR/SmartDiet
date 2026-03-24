const app = getApp()

Page({
  data: {
    loading: true,
    userInfo: null,
    cloudReady: false
  },

  onLoad: function() {
    this.initCloud()
  },

  initCloud: async function() {
    try {
      if (!wx.cloud) {
        this.setData({
          loading: false,
          cloudReady: false
        })
        return
      }
      
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

  checkLogin: function() {
    if (app.globalData.hasLogin) {
      wx.switchTab({
        url: '/pages/chat/index'
      })
    }
  },

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
          app.globalData.hasLogin = true
          app.globalData.openid = result.openid
          
          if (result.data) {
            app.globalData.userInfo = result.data
            wx.setStorageSync('userInfo', result.data)
          }
          
          wx.hideLoading()
          
          if (result.data && result.data.age && result.data.height && result.data.weight) {
            wx.switchTab({
              url: '/pages/chat/index'
            })
          } else {
            wx.redirectTo({
              url: '/pages/onboarding/index'
            })
          }
          return
        }
        
        if (result.needInit) {
          wx.hideLoading()
          wx.showModal({
            title: '需要初始化',
            content: '数据库集合不存在，请前往云开发控制台创建 users 集合，或点击"跳过登录"先体验功能',
            confirmText: '去控制台',
            cancelText: '跳过登录',
            success: (res) => {
              if (res.confirm) {
                wx.showModal({
                  title: '提示',
                  content: '请在微信开发者工具中：云开发控制台 -> 数据库 -> 添加集合 -> 输入 users',
                  showCancel: false
                })
              } else {
                this.skipLogin()
              }
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
      let showSkip = true
      
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
        content: errorMsg + (showSkip ? '\n\n您可以选择"跳过登录"先体验功能' : ''),
        showCancel: showSkip,
        cancelText: '跳过登录',
        confirmText: '重试',
        success: (res) => {
          if (res.cancel) {
            this.skipLogin()
          }
        }
      })
    }
  },

  onGetUserProfile: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        })
        this.onLogin()
      },
      fail: () => {
        this.onLogin()
      }
    })
  },

  skipLogin: function() {
    app.globalData.hasLogin = true
    wx.redirectTo({
      url: '/pages/onboarding/index'
    })
  },

  onSkip: function() {
    this.skipLogin()
  }
})
