const { api, safeApiCall } = require('../../utils/api')
const app = getApp()

Page({
  data: {
    loading: true,
    userInfo: null,
  },

  onLoad() {
    this.autoLogin()
  },

  autoLogin() {
    if (app.globalData.hasLogin) {
      wx.switchTab({ url: '/pages/chat/index' })
      return
    }
    this.setData({ loading: false })
  },

  async onLogin() {
    wx.showLoading({ title: '登录中...' })

    try {
      // 调用微信登录获取临时 code
      const loginResult = await wx.login()
      if (!loginResult.code) {
        throw new Error('获取微信登录凭证失败')
      }

      const result = await safeApiCall(() => api.user.login(loginResult.code))

      if (result.success && result.data) {
        const { token, user, isNew } = result.data

        wx.setStorageSync('token', token)
        app.globalData.hasLogin = true
        app.globalData.openid = user.openid

        if (user) {
          app.globalData.userInfo = user
          wx.setStorageSync('userInfo', user)
        }

        wx.hideLoading()

        if (isNew || !user.age) {
          wx.redirectTo({ url: '/pages/onboarding/index' })
        } else {
          wx.switchTab({ url: '/pages/chat/index' })
        }
      } else {
        throw new Error(result.error || '登录失败')
      }
    } catch (error) {
      wx.hideLoading()
      wx.showModal({
        title: '登录失败',
        content: error.message || '请检查后端服务是否启动',
        showCancel: false,
        confirmText: '重试',
      })
    }
  },
})
