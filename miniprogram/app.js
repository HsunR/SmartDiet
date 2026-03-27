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

  login: function(callback) {
    const that = this
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        that.globalData.userInfo = {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
        that.globalData.hasLogin = true
        wx.setStorageSync('userInfo', that.globalData.userInfo)
        
        if (callback) {
          callback(true, that.globalData.userInfo)
        }
      },
      fail: () => {
        if (callback) {
          callback(false, null)
        }
      }
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
