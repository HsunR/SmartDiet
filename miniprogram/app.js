App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-5g94ikff8709bdba',
        traceUser: true,
      })
    }
    
    this.checkLoginStatus()
  },

  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.hasLogin = true
    }
  },

  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: null,
    systemInfo: null
  }
})
