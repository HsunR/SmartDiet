/**
 * @page chat
 * @description 聊天页面 - AI 营养师主界面
 */

const { STORAGE_KEYS } = require('../../utils/constants')
const chatService = require('../../services/chat-service')
const imageService = require('../../services/image-service')

const handlers = require('./handlers/index.js')

Page({
  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToView: '',
    dailyCalories: 0,
    userProfile: null,
    currentImageUrl: '',
    currentCloudFileId: '',
    recognizingTasks: {},
    pendingRecord: null
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    this.updateTabBar()
    this.handlePendingRecord()
    this.updateDailyProgress()
    this.checkUserProfile()
  },

  onUnload() { chatService.saveMessages(this.data.messages) },
  onHide() { chatService.saveMessages(this.data.messages) },

  updateTabBar() {
    const tabBar = this.getTabBar?.()
    if (tabBar) tabBar.setData({ selected: 0 })
  },

  // 处理待处理的记录，从全局数据中获取并触发图片选择
  handlePendingRecord() {
    const app = getApp()
    if (app.globalData.pendingRecord) {
      this.setData({ pendingRecord: app.globalData.pendingRecord })
      app.globalData.pendingRecord = null
      setTimeout(() => this.chooseImage(), 500)
    }
  },

  checkLogin() {
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.redirectTo({ url: '/pages/login/index' })
    } else {
      this.initChat()
    }
  },

  initChat() {
    const savedMessages = chatService.loadMessages()
    if (savedMessages) {
      this.setData({ messages: savedMessages })
      this.scrollToBottom()
    } else {
      this.setData({ messages: chatService.initChat() })
    }
  },

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

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onPreviewImage(e) {
    imageService.previewImage(e.currentTarget.dataset.url)
  },

  onQuickAction(e) {
    const { action } = e.currentTarget.dataset
    const actions = {
      photo: () => this.chooseImage(),
      report: () => wx.switchTab({ url: '/pages/report/index' }),
      recommend: () => this.getRecommendation()
    }
    actions[action]?.()
  },

  onInputFocus() { this.setData({ inputFocus: true }) },
  onInputBlur() { this.setData({ inputFocus: false }) },

  onViewReport() { wx.switchTab({ url: '/pages/report/index' }) },
  onPullDownRefresh() { this.initChat(); wx.stopPullDownRefresh() },

  onShareAppMessage() {
    return {
      title: 'AI 营养师 - 智能饮食管理助手',
      path: '/pages/chat/index'
    }
  },

  ...handlers
})