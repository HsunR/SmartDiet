const { 
  createTextMessage, 
  createImageMessage, 
  createFoodCardMessage, 
  createMealTypePickerMessage,
  createFeedbackInputMessage,
  createUserInfoFormMessage,
  createQuickActionsMessage,
  MESSAGE_TYPES, 
  MESSAGE_ROLES 
} = require('../../utils/constants')
const { generateId, formatDate, formatTimeAgo, compressImage, uploadAndGetUrl } = require('../../utils/util')
const { api, safeApiCall } = require('../../utils/api')

Page({
  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToView: '',
    inputFocus: false,
    dailyCalories: 0,
    userProfile: null,
    hasInitialized: false,
    formValues: {},
    feedbackValues: {},
    pickerIndex: 0,
    selectedMealType: 'breakfast'
  },

  onLoad: function(options) {
    this.checkLogin()
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    this.updateDailyProgress()
    this.checkUserProfile()
  },

  checkLogin: function() {
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
    } else {
      this.initChat()
    }
  },

  checkUserProfile: async function() {
    try {
      const result = await safeApiCall(() => api.user.getProfile())
      
      if (result.success && result.data) {
        const profile = result.data
        this.setData({ userProfile: profile })
        
        if (!profile.age || !profile.height || !profile.weight) {
          if (!this.data.hasInitialized) {
            this.showUserInfoForm()
          }
        }
      } else {
        if (!this.data.hasInitialized) {
          this.showUserInfoForm()
        }
      }
    } catch (error) {
      console.error('Check profile error:', error)
    }
  },

  showUserInfoForm: function() {
    const formMessage = createUserInfoFormMessage()
    this.setData({
      messages: [...this.data.messages, formMessage],
      hasInitialized: true
    })
    this.scrollToBottom()
  },

  initChat: function() {
    const welcomeMessage = createTextMessage(
      MESSAGE_ROLES.ASSISTANT,
      '您好！我是您的AI营养师 🧑‍⚕️\n\n我可以帮您：\n• 📷 拍照识别食物并计算营养\n• 📊 查看每日饮食报告\n• 💡 获取个性化饮食建议\n\n点击下方相机按钮开始记录今天的美餐吧！'
    )
    
    const quickActions = createQuickActionsMessage()
    
    this.setData({
      messages: [welcomeMessage, quickActions],
      hasInitialized: true
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
        
        const mealOverview = recognizeResult.mealOverview || {
          mealType: this.getCurrentMealTypeLabel(),
          totalCalories: foods.reduce((sum, f) => sum + (f.nutrients?.calories || f.nutrientsEstimation?.calories || 0), 0),
          overallHealthScore: 60,
          healthTags: { positive: [], warning: [] },
          summary: '识别成功'
        }
        
        const dietaryAdvice = recognizeResult.dietaryAdvice || ''
        
        const foodCardMessage = createFoodCardMessage(foods, mealOverview, dietaryAdvice, generateId())
        
        this.setData({
          messages: [...this.data.messages, foodCardMessage],
          currentImageUrl: tempUrl,
          currentFoods: foods,
          currentMealOverview: mealOverview
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
      const result = await safeApiCall(() => api.food.getRecords(today))
      
      if (result.success && result.data) {
        const records = result.data
        const totalCalories = records.reduce((sum, r) => sum + (r.totalCalories || 0), 0)
        const foods = []
        records.forEach(r => {
          (r.foods || []).forEach(f => foods.push(f.name))
        })
        
        const message = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `📊 今日饮食摘要\n\n` +
          `总热量：${totalCalories} kcal\n` +
          `用餐次数：${records.length} 次\n` +
          `食物种类：${[...new Set(foods)].join('、')}\n\n` +
          `建议保持均衡饮食，多吃蔬菜水果！`
        )
        this.setData({
          messages: [...this.data.messages, message]
        })
      }
    } catch (error) {
      this.showErrorMessage('获取建议失败，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  onFoodCardConfirm: function(e) {
    const { foods, mealOverview, dietaryAdvice } = e.detail
    
    const defaultMealType = this.getCurrentMealType()
    const defaultIndex = ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(defaultMealType)
    
    const pickerMessage = createMealTypePickerMessage(mealOverview, foods)
    
    const messages = this.data.messages.map(msg => {
      if (msg.type === MESSAGE_TYPES.FOOD_CARD && msg.data.foods === foods) {
        return { ...msg, data: { ...msg.data, actionCompleted: true } }
      }
      return msg
    })
    
    this.setData({
      messages: [...messages, pickerMessage],
      pickerIndex: defaultIndex >= 0 ? defaultIndex : 0,
      selectedMealType: defaultMealType,
      pendingFoods: foods,
      pendingMealOverview: mealOverview
    })
    this.scrollToBottom()
  },

  onFoodCardEdit: function(e) {
    const { foods, mealOverview } = e.detail
    
    const feedbackMessage = createFeedbackInputMessage(foods, mealOverview, this.data.currentImageUrl)
    
    const messages = this.data.messages.map(msg => {
      if (msg.type === MESSAGE_TYPES.FOOD_CARD && msg.data.foods === foods) {
        return { ...msg, data: { ...msg.data, actionCompleted: true } }
      }
      return msg
    })
    
    this.setData({
      messages: [...messages, feedbackMessage]
    })
    this.scrollToBottom()
  },

  onMealPickerChange: function(e) {
    const index = e.detail.value[0]
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
    this.setData({
      pickerIndex: index,
      selectedMealType: mealTypes[index]
    })
  },

  onMealTypeConfirm: async function(e) {
    const { selectedMealType, pendingFoods, pendingMealOverview } = this.data
    
    if (!pendingFoods || pendingFoods.length === 0) {
      this.showErrorMessage('没有食物数据')
      return
    }
    
    this.setData({ isLoading: true })
    
    try {
      const record = {
        date: formatDate(new Date()),
        mealType: selectedMealType,
        foods: pendingFoods,
        totalCalories: pendingMealOverview?.totalCalories || pendingFoods.reduce((sum, f) => sum + (f.nutrients?.calories || f.nutrientsEstimation?.calories || 0), 0),
        imageUrl: pendingFoods[0]?.imageUrl || '',
        mealOverview: pendingMealOverview
      }
      
      const result = await safeApiCall(() => api.food.addRecord(record))
      
      if (result.success) {
        const successMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `✅ 已记录为${this.getMealTypeLabel(selectedMealType)}！\n\n本餐热量：${record.totalCalories} kcal\n健康评分：${pendingMealOverview?.overallHealthScore || 60}分`
        )
        
        const messages = this.data.messages.map(msg => {
          if (msg.type === MESSAGE_TYPES.MEAL_TYPE_PICKER) {
            return { ...msg, data: { ...msg.data, completed: true } }
          }
          return msg
        })
        
        this.setData({
          messages: [...messages, successMessage],
          pendingFoods: null,
          pendingMealOverview: null
        })
        this.updateDailyProgress()
      } else {
        this.showErrorMessage(result.error || '保存记录失败')
      }
    } catch (error) {
      console.error('Save record error:', error)
      this.showErrorMessage('保存记录失败')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  onFeedbackSubmit: async function(e) {
    const { feedback } = e.detail
    const feedbackMsg = this.data.messages.find(m => m.type === MESSAGE_TYPES.FEEDBACK_INPUT)
    const { foods, mealOverview, imageUrl } = feedbackMsg?.data || {}
    
    if (!imageUrl) {
      this.showErrorMessage('请重新上传图片')
      return
    }
    
    this.setData({ isLoading: true })
    
    try {
      const recognizeResult = await safeApiCall(() => api.food.recognizeWithFeedback(imageUrl, feedback))
      
      if (recognizeResult.success && recognizeResult.foods) {
        const newFoods = recognizeResult.foods
        newFoods.forEach(food => {
          food.imageUrl = foods[0]?.imageUrl || ''
        })
        
        const newMealOverview = recognizeResult.mealOverview || mealOverview
        const newDietaryAdvice = recognizeResult.dietaryAdvice || ''
        
        const foodCardMessage = createFoodCardMessage(newFoods, newMealOverview, newDietaryAdvice, generateId())
        
        const messages = this.data.messages.map(msg => {
          if (msg.type === MESSAGE_TYPES.FEEDBACK_INPUT) {
            return { ...msg, data: { ...msg.data, completed: true } }
          }
          return msg
        })
        
        const feedbackText = createTextMessage(MESSAGE_ROLES.USER, `反馈：${feedback}`)
        
        this.setData({
          messages: [...messages, feedbackText, foodCardMessage],
          currentFoods: newFoods,
          currentMealOverview: newMealOverview
        })
      } else {
        this.showErrorMessage('重新识别失败，请重试')
      }
    } catch (error) {
      console.error('Re-recognize error:', error)
      this.showErrorMessage('重新识别失败')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  onUserInfoSubmit: async function(e) {
    const { formData } = e.detail
    
    this.setData({ isLoading: true })
    
    try {
      const result = await safeApiCall(() => api.user.updateProfile(formData))
      
      if (result.success) {
        const successMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `✅ 个人信息已保存！\n\n根据您的信息，我已为您计算了每日营养目标。开始记录您的第一餐吧！`
        )
        
        const messages = this.data.messages.map(msg => {
          if (msg.type === MESSAGE_TYPES.USER_INFO_FORM) {
            return { ...msg, data: { ...msg.data, completed: true } }
          }
          return msg
        })
        
        this.setData({
          messages: [...messages, successMessage],
          userProfile: formData
        })
      } else {
        this.showErrorMessage('保存失败，请重试')
      }
    } catch (error) {
      console.error('Save user info error:', error)
      this.showErrorMessage('保存失败')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  onFormFieldInput: function(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      formValues: {
        ...this.data.formValues,
        [field]: value
      }
    })
  },

  onFormFieldPicker: function(e) {
    const { field } = e.currentTarget.dataset
    const index = e.detail.value
    const fieldDef = this.data.messages.find(m => m.type === MESSAGE_TYPES.USER_INFO_FORM)?.data?.fields?.find(f => f.key === field)
    if (fieldDef) {
      this.setData({
        formValues: {
          ...this.data.formValues,
          [field]: fieldDef.options[index]
        }
      })
    }
  },

  onMultiPickerToggle: function(e) {
    const { field, value } = e.currentTarget.dataset
    const currentValues = this.data.formValues[field] || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    this.setData({
      formValues: {
        ...this.data.formValues,
        [field]: newValues
      }
    })
  },

  onUserInfoFormSubmit: function(e) {
    const formData = {
      ...this.data.formValues,
      goals: this.data.formValues.goals || []
    }
    
    if (!formData.age || !formData.height || !formData.weight) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }
    
    this.onUserInfoSubmit({ detail: { formData } })
  },

  onFeedbackInput: function(e) {
    const { msgId } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      feedbackValues: {
        ...this.data.feedbackValues,
        [msgId]: value
      }
    })
  },

  onFeedbackSubmitBtn: function(e) {
    const { msgId } = e.currentTarget.dataset
    const feedback = this.data.feedbackValues[msgId]
    
    if (!feedback || !feedback.trim()) {
      wx.showToast({
        title: '请输入反馈意见',
        icon: 'none'
      })
      return
    }
    
    this.onFeedbackSubmit({ detail: { feedback } })
  },

  getCurrentMealType: function() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return 'breakfast'
    if (hour >= 11 && hour < 14) return 'lunch'
    if (hour >= 17 && hour < 20) return 'dinner'
    return 'snack'
  },

  getCurrentMealTypeLabel: function() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return '早餐'
    if (hour >= 11 && hour < 14) return '午餐'
    if (hour >= 17 && hour < 20) return '晚餐'
    return '其他'
  },

  getMealTypeLabel: function(type) {
    const labels = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '其他'
    }
    return labels[type] || '其他'
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

  previewImage: function(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: [url],
      current: url
    })
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
