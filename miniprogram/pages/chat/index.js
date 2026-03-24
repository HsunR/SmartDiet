const { createTextMessage, createImageMessage, createFoodCardMessage, createQuickActionsMessage, MESSAGE_TYPES, MESSAGE_ROLES } = require('../../utils/constants')
const { generateId, formatDate, formatTimeAgo, compressImage, uploadFile, uploadAndGetUrl } = require('../../utils/util')
const { api, safeApiCall } = require('../../utils/api')

Page({
  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToView: '',
    inputFocus: false
  },

  onLoad: function(options) {
    this.checkLogin()
    this.initChat()
  },

  onShow: function() {
    this.updateDailyProgress()
  },

  checkLogin: function() {
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
    }
  },

  initChat: function() {
    const welcomeMessage = createTextMessage(
      MESSAGE_ROLES.ASSISTANT,
      '您好！我是您的AI营养师 🧑‍⚕️\n\n我可以帮您：\n• 📷 拍照识别食物并计算营养\n• 📊 查看每日饮食报告\n• 💡 获取个性化饮食建议\n\n今天想记录什么美食呢？'
    )
    
    const quickActions = createQuickActionsMessage()
    
    this.setData({
      messages: [welcomeMessage, quickActions]
    })
  },

  updateDailyProgress: async function() {
    try {
      const today = formatDate(new Date())
      const result = await safeApiCall(() => api.food.getRecords(today))
      
      if (result.success && result.data) {
        const totalCalories = result.data.reduce((sum, r) => sum + (r.totalCalories || 0), 0)
        this.setData({
          dailyCalories: totalCalories
        })
      }
    } catch (error) {
      console.error('Update progress error:', error)
    }
  },

  onInputChange: function(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  sendMessage: async function() {
    const { inputValue, isLoading } = this.data
    
    if (!inputValue.trim() || isLoading) return
    
    const userMessage = createTextMessage(MESSAGE_ROLES.USER, inputValue.trim())
    
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isLoading: true
    })
    
    this.scrollToBottom()
    
    try {
      const result = await safeApiCall(() => api.chat.send(inputValue.trim(), {
        messages: this.data.messages.slice(-10)
      }))
      
      if (result.success && result.data) {
        const aiMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, result.data.reply)
        this.setData({
          messages: [...this.data.messages, aiMessage]
        })
      } else {
        this.showErrorMessage('AI回复失败，请稍后重试')
      }
    } catch (error) {
      this.showErrorMessage('网络错误，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  chooseImage: function() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        this.pickImage(sourceType)
      }
    })
  },

  pickImage: async function(sourceType) {
    try {
      const chooseResult = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: sourceType,
        sizeType: ['compressed']
      })
      
      const tempFilePath = chooseResult.tempFiles[0].tempFilePath
      
      const userMessage = createImageMessage(MESSAGE_ROLES.USER, tempFilePath)
      this.setData({
        messages: [...this.data.messages, userMessage],
        isLoading: true
      })
      
      this.scrollToBottom()
      
      const compressedPath = await compressImage(tempFilePath, 80)
      
      const cloudPath = `food_images/${generateId()}.jpg`
      const { fileID, tempUrl } = await uploadAndGetUrl(cloudPath, compressedPath)
      
      const recognizeResult = await safeApiCall(() => api.food.recognize(tempUrl))
      
      if (recognizeResult.success && recognizeResult.foods) {
        const foods = recognizeResult.foods
        foods.forEach(food => {
          food.imageUrl = fileID
        })
        
        const foodCardMessage = createFoodCardMessage(foods, generateId())
        
        const description = recognizeResult.description || ''
        const confirmMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `我识别到了 ${foods.length} 种食物${description ? '：' + description : ''}\n\n请确认或修改：`
        )
        
        this.setData({
          messages: [...this.data.messages, confirmMessage, foodCardMessage]
        })
      } else {
        const errorMsg = recognizeResult.message || recognizeResult.error || '无法识别图片中的食物'
        this.showErrorMessage(errorMsg)
      }
    } catch (error) {
      console.error('Image process error:', error)
      this.showErrorMessage('图片处理失败，请重试')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  onQuickAction: function(e) {
    const { action } = e.currentTarget.dataset
    
    switch (action) {
      case 'photo':
        this.chooseImage()
        break
      case 'report':
        wx.switchTab({
          url: '/pages/report/index'
        })
        break
      case 'recommend':
        this.getRecommendation()
        break
      default:
        break
    }
  },

  getRecommendation: async function() {
    this.setData({ isLoading: true })
    
    try {
      const today = formatDate(new Date())
      const gapsResult = await safeApiCall(() => api.report.analyzeGaps(today))
      
      if (gapsResult.success && gapsResult.gaps) {
        const recommendResult = await safeApiCall(() => api.recommend.getFoodRecommendation(gapsResult.gaps, {}))
        
        if (recommendResult.success && recommendResult.suggestions) {
          const message = createTextMessage(
            MESSAGE_ROLES.ASSISTANT,
            this.formatRecommendations(recommendResult.suggestions)
          )
          this.setData({
            messages: [...this.data.messages, message]
          })
        }
      }
    } catch (error) {
      this.showErrorMessage('获取建议失败，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  formatRecommendations: function(suggestions) {
    let text = '💡 今日饮食建议：\n\n'
    
    suggestions.forEach((s, index) => {
      text += `${index + 1}. ${s.type === '补充' ? '➕' : '➖'} ${s.nutrient}\n`
      text += `   推荐：${s.foods.join('、')}\n`
      text += `   原因：${s.reason}\n\n`
    })
    
    return text
  },

  onFoodCardConfirm: async function(e) {
    console.log('onFoodCardConfirm triggered', e)
    const { foods, recordId } = e.detail
    console.log('foods:', foods, 'recordId:', recordId)
    
    if (!foods || foods.length === 0) {
      this.showErrorMessage('没有食物数据')
      return
    }
    
    try {
      const record = {
        date: formatDate(new Date()),
        mealType: this.getCurrentMealType(),
        foods: foods,
        totalCalories: foods.reduce((sum, f) => sum + (f.nutrients?.calories || 0), 0),
        imageUrl: foods[0]?.imageUrl || ''
      }
      
      console.log('Saving record:', record)
      
      const result = await safeApiCall(() => api.food.addRecord(record))
      
      if (result.success) {
        const successMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `✅ 已记录！本餐热量：${record.totalCalories} kcal`
        )
        this.setData({
          messages: [...this.data.messages, successMessage]
        })
        this.updateDailyProgress()
      } else {
        this.showErrorMessage(result.error || '保存记录失败')
      }
    } catch (error) {
      console.error('Save record error:', error)
      this.showErrorMessage('保存记录失败')
    }
    
    this.scrollToBottom()
  },

  onFoodCardEdit: function(e) {
    console.log('onFoodCardEdit triggered', e)
    const { foods } = e.detail
    console.log('foods for edit:', foods)
    
    if (!foods || foods.length === 0) {
      wx.showToast({
        title: '没有食物数据',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/recognize/index?foods=${encodeURIComponent(JSON.stringify(foods))}`
    })
  },

  getCurrentMealType: function() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return 'breakfast'
    if (hour >= 11 && hour < 14) return 'lunch'
    if (hour >= 17 && hour < 20) return 'dinner'
    return 'snack'
  },

  showErrorMessage: function(message) {
    const errorMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, `❌ ${message}`)
    this.setData({
      messages: [...this.data.messages, errorMessage]
    })
  },

  scrollToBottom: function() {
    const messages = this.data.messages
    if (messages.length > 0) {
      this.setData({
        scrollToView: `msg-${messages[messages.length - 1].id}`
      })
    }
  },

  onInputFocus: function() {
    this.setData({ inputFocus: true })
  },

  onInputBlur: function() {
    this.setData({ inputFocus: false })
  },

  onViewReport: function() {
    wx.switchTab({
      url: '/pages/report/index'
    })
  },

  onPullDownRefresh: function() {
    this.initChat()
    wx.stopPullDownRefresh()
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 智能饮食管理助手',
      path: '/pages/chat/index'
    }
  }
})
