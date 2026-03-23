const app = getApp()

Page({
  data: {
    loading: true,
    userInfo: null
  },

  onLoad: function() {
    this.checkLogin()
  },

  checkLogin: function() {
    if (app.globalData.hasLogin) {
      wx.switchTab({
        url: '/pages/chat/index'
      })
    } else {
      this.setData({
        loading: false
      })
    }
  },

  onLogin: async function() {
    wx.showLoading({ title: '登录中...' })
    
    try {
      const loginResult = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'login' }
      })
      
      if (loginResult.result && loginResult.result.success) {
        app.globalData.hasLogin = true
        app.globalData.openid = loginResult.result.openid
        
        if (loginResult.result.data) {
          app.globalData.userInfo = loginResult.result.data
        }
        
        wx.hideLoading()
        
        wx.switchTab({
          url: '/pages/chat/index'
        })
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      wx.hideLoading()
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
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

  onSkip: function() {
    app.globalData.hasLogin = true
    wx.switchTab({
      url: '/pages/chat/index'
    })
  }
})
