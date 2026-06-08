const { STORAGE_KEYS } = require('./utils/constants')

App({
  onLaunch() {
    // 先检查用户登录状态
    this.checkLoginStatus()
  },

  onError(error) {
    console.error('应用发生错误:', error)
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO)
    const token = wx.getStorageSync('token')
    if (userInfo && token) {
      this.globalData.userInfo = userInfo
      this.globalData.hasLogin = true
    }
  },

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

  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: null,
    systemInfo: null,
    pendingRecord: null,
    needRefreshReport: false
  }
})
