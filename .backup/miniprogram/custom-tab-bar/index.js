Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/chat/index",
        text: "聊天",
        iconPath: "/assets/icons/chat.svg",
        selectedIconPath: "/assets/icons/chat-active.svg"
      },
      {
        pagePath: "/pages/report/index",
        text: "报告",
        iconPath: "/assets/icons/report.svg",
        selectedIconPath: "/assets/icons/report-active.svg"
      },
      {
        pagePath: "/pages/profile/index",
        text: "我的",
        iconPath: "/assets/icons/profile.svg",
        selectedIconPath: "/assets/icons/profile-active.svg"
      }
    ]
  },

  methods: {
    switchTab: function(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      
      wx.switchTab({
        url: url
      })
    }
  }
})
