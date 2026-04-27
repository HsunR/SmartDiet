/**
 * 自定义 Tab 栏组件
 * 实现底部导航栏的切换功能
 * 包含聊天、报告、我的三个页面入口
 * @component CustomTabBar
 * @version 1.0.0
 */

Component({
  /**
   * 组件内部数据
   */
  data: {
    selected: 0,    // 当前选中的 Tab 索引
    list: [         // Tab 栏配置列表
      {
        pagePath: "/pages/chat/index",      // 聊天页路径
        text: "聊天",                        // 显示文本
        iconPath: "/assets/icons/chat.svg", // 默认图标
        selectedIconPath: "/assets/icons/chat-active.svg" // 选中图标
      },
      {
        pagePath: "/pages/report/index",    // 报告页路径
        text: "报告",                        // 显示文本
        iconPath: "/assets/icons/report.svg", // 默认图标
        selectedIconPath: "/assets/icons/report-active.svg" // 选中图标
      },
      {
        pagePath: "/pages/profile/index",   // 个人页路径
        text: "我的",                        // 显示文本
        iconPath: "/assets/icons/profile.svg", // 默认图标
        selectedIconPath: "/assets/icons/profile-active.svg" // 选中图标
      }
    ]
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * Tab 切换事件处理
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前元素对象
     * @param {Object} e.currentTarget.dataset - 数据属性，包含 path
     */
    switchTab: function(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      
      // 调用微信 switchTab API 进行页面跳转
      wx.switchTab({
        url: url
      })
    }
  }
})
