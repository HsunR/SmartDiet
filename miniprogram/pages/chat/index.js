/**
 * @page chat - AI 营养师聊天主界面
 *
 * 职责：
 * - 页面生命周期管理 (onLoad/onShow/onHide/onUnload)
 * - 登录态检查 + 引导页跳转
 * - 聊天消息初始化（本地缓存恢复或创建欢迎语）
 * - 底部输入栏与快捷操作路由
 *
 * 业务逻辑分散在各 handlers/ 文件中，通过 ...handlers 混入 Page。
 */

const { STORAGE_KEYS } = require('../../utils/constants')
const chatService = require('../../services/chat-service')
const imageService = require('../../services/image-service')

const handlers = require('./handlers/index.js')

Page({
  /* ==================== 页面数据 ==================== */
  data: {
    messages: [],             // 聊天消息列表
    inputValue: '',            // 输入框当前文本
    isLoading: false,          // AI 响应或识别进行中
    userProfile: null,         // 当前用户档案
    currentImageUrl: '',       // 最近选择的图片 URL
    currentCloudFileId: '',    // 最近选择的云文件 ID
    recognizingTasks: {},      // 正在进行中的食物识别任务 map
    pendingRecord: null,        // 来自外部页面的待处理记录
    scrollIntoView: '',         // scroll-into-view 指向的消息 ID
    scrollTop: 0,               // scroll-top 流式模式下强制滚动到最新消息
    isAtBottom: true,           // 用户是否在底部
    showScrollToBottom: false   // 是否显示回到底部按钮
  },

  /* ==================== 生命周期 ==================== */
  onLoad() {
    this.checkLogin()
  },

  onReady() {
    this._showButtonThreshold = 30
    this._autoScrollThreshold = 150
    this._scrollTopValue = 999999
    this.createSelectorQuery()
      .select('.message-list')
      .boundingClientRect(rect => {
        if (rect) this._viewHeight = rect.height
      })
      .exec()
  },

  onShow() {
    const app = getApp()
    if (!app.globalData.hasLogin) return
    this.updateTabBar()
    this.handlePendingRecord()
    this.updateDailyProgress()
    this.checkUserProfile()
  },

  onUnload() { chatService.saveMessages(this.data.messages) },
  onHide() { chatService.saveMessages(this.data.messages) },

  /* ==================== TabBar ==================== */
  updateTabBar() {
    const tabBar = this.getTabBar?.()
    if (tabBar) tabBar.setData({ selected: 0 })
  },

  /* ==================== 登录与初始化 ==================== */

  /** 从全局检查登录态，未登录跳转登录页 */
  checkLogin() {
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.redirectTo({ url: '/pages/login/index' })
    } else {
      this.initChat()
    }
  },

  /** 恢复本地聊天记录，无缓存则创建欢迎消息 */
  initChat() {
    const savedMessages = chatService.loadMessages()
    if (savedMessages) {
      this.setData({ messages: savedMessages }, () => this.scrollToBottom())
    } else {
      this.setData({ messages: chatService.initChat() }, () => this.scrollToBottom())
    }
  },

  /** 检查用户是否完成了引导页（身高/体重等），未完成跳转引导页 */
  checkUserProfile: async function() {
    const hasCompletedOnboarding = wx.getStorageSync(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING)
    if (hasCompletedOnboarding) return

    try {
      const { api, safeApiCall } = require('../../utils/api')
      const result = await safeApiCall(() => api.user.getProfile())
      if (result.success && result.data) {
        this.setData({ userProfile: result.data })
        if (!result.data.age || !result.data.height || !result.data.weight) {
          wx.redirectTo({ url: '/pages/onboarding/index' })
        }
      } else {
        wx.redirectTo({ url: '/pages/onboarding/index' })
      }
    } catch (error) {
      console.error('Check profile error:', error)
    }
  },

  /** 其他页面有未完成的记录待处理时，触发拍照 */
  handlePendingRecord() {
    const app = getApp()
    if (app.globalData.pendingRecord) {
      this.setData({ pendingRecord: app.globalData.pendingRecord })
      app.globalData.pendingRecord = null
      setTimeout(() => this.chooseImage(), 500)
    }
  },

  /* ==================== 输入栏事件 ==================== */
  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  /** 图片预览 */
  onPreviewImage(e) {
    imageService.previewImage(e.currentTarget.dataset.url)
  },

  /** 图片加载完成后无需额外操作 */
  onImageLoaded() {
    if (this.data.isAtBottom) this.scrollToBottom()
  },

  /* ==================== 快捷操作路由 ==================== */
  onQuickAction(e) {
    const { actionId } = e.detail
    const actions = {
      photo: () => this.chooseImage(),
      report: () => wx.switchTab({ url: '/pages/report/index' }),
      recommend: () => this.getRecommendation()
    }
    actions[actionId]?.()
  },

  onViewReport() { wx.switchTab({ url: '/pages/report/index' }) },
  onPullDownRefresh() { this.initChat(); wx.stopPullDownRefresh() },

  /** 滚动到最新消息 */
  scrollToBottom() {
    if (!this.data.isAtBottom) return
    if (!this.data.messages.length) return

    this._scrollTopValue++
    this.setData({
      scrollIntoView: '',
      scrollTop: this._scrollTopValue
    })
  },

  /** 滚动事件：检测用户是否在底部 */
  onScroll(e) {
    const { scrollTop, scrollHeight } = e.detail
    const viewHeight = this._viewHeight || 0
    if (!viewHeight) return
    const distanceFromBottom = scrollHeight - scrollTop - viewHeight

    const nearBottom = distanceFromBottom < (this._showButtonThreshold || 50)
    const farFromBottom = distanceFromBottom > (this._autoScrollThreshold || 200)

    if (nearBottom) {
      if (this.data.showScrollToBottom || !this.data.isAtBottom) {
        this.setData({ showScrollToBottom: false, isAtBottom: true })
      }
    } else if (farFromBottom) {
      if (!this.data.showScrollToBottom || this.data.isAtBottom) {
        this.setData({ isAtBottom: false, showScrollToBottom: true })
      }
    }
  },

  /** 点击回到底部按钮 */
  onTapScrollToBottom() {
    this.setData({ isAtBottom: true, showScrollToBottom: false })
    this.scrollToBottom()
  },

  /* ==================== 分享 ==================== */
  onShareAppMessage() {
    return {
      title: 'AI 营养师 - 智能饮食管理助手',
      path: '/pages/chat/index'
    }
  },

  /* ==================== 混入 handlers 业务逻辑 ==================== */
  ...handlers
})
