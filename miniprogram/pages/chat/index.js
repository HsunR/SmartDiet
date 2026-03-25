const { 
  createTextMessage, 
  createImageMessage, 
  createFoodCardMessage, 
  createMealTypePickerMessage,
  createMealTypeSelectMessage,
  createRatingSelectMessage,
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
    scrollTop: 0,
    inputFocus: false,
    dailyCalories: 0,
    userProfile: null,
    hasInitialized: false,
    formValues: {},
    feedbackValues: {},
    pickerIndex: 0,
    selectedMealType: 'breakfast',
    currentImageUrl: '',
    currentCloudFileId: '',
    currentFoods: [],
    currentMealOverview: {},
    editingFoodCardIndex: -1,
    recognizingTasks: {}
  },

  STORAGE_KEY: 'chat_messages',

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

  onUnload: function() {
    this.saveChatMessages()
  },

  onHide: function() {
    this.saveChatMessages()
  },

  checkLogin: function() {
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
    } else {
      this.initChat()
    }
  },

  saveChatMessages: function() {
    try {
      const messages = this.data.messages
      if (messages && messages.length > 0) {
        wx.setStorageSync(this.STORAGE_KEY, messages)
      }
    } catch (e) {
      console.error('保存聊天记录失败:', e)
    }
  },

  loadChatMessages: function() {
    try {
      const messages = wx.getStorageSync(this.STORAGE_KEY)
      if (messages && messages.length > 0) {
        this.setData({ 
          messages: messages,
          hasInitialized: true
        })
        return true
      }
    } catch (e) {
      console.error('读取聊天记录失败:', e)
    }
    return false
  },

  checkUserProfile: async function() {
    const hasCompletedOnboarding = wx.getStorageSync('hasCompletedOnboarding')
    if (hasCompletedOnboarding) {
      return
    }
    
    try {
      const result = await safeApiCall(() => api.user.getProfile())
      
      if (result.success && result.data) {
        const profile = result.data
        this.setData({ userProfile: profile })
        
        if (!profile.age || !profile.height || !profile.weight) {
          wx.redirectTo({
            url: '/pages/onboarding/index'
          })
        }
      } else {
        wx.redirectTo({
          url: '/pages/onboarding/index'
        })
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
    if (!this.loadChatMessages()) {
      const welcomeMessage = createTextMessage(
        MESSAGE_ROLES.ASSISTANT,
        '您好！我是您的AI营养师 🧑‍⚕️\n\n我可以帮您：\n• 📷 拍照识别食物并计算营养\n• 📊 查看每日饮食报告\n• 💡 获取个性化饮食建议\n\n点击下方相机按钮开始记录今天的美餐吧！'
      )
      
      const quickActions = createQuickActionsMessage()
      
      this.setData({
        messages: [welcomeMessage, quickActions],
        hasInitialized: true
      })
    } else {
      this.scrollToBottom()
    }
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
    
    this.saveChatMessages()
    this.scrollToBottom()
    
    try {
      const result = await safeApiCall(() => api.chat.send(inputValue.trim(), {
        messages: this.data.messages.slice(-10)
      }))
      
      if (result.success && result.reply) {
        const aiMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, result.reply)
        this.setData({
          messages: [...this.data.messages, aiMessage]
        })
        this.saveChatMessages()
      } else {
        const errorMsg = result.error || result.message || 'AI回复失败，请稍后重试'
        this.showErrorMessage(errorMsg)
      }
    } catch (error) {
      const errorMsg = error.message || '网络错误，请稍后重试'
      this.showErrorMessage(errorMsg)
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
        messages: [...this.data.messages, userMessage]
      })
      
      this.saveChatMessages()
      this.scrollToBottom()
      
      const compressedPath = await compressImage(tempFilePath, 80)
      
      const cloudPath = `food_images/${generateId()}.jpg`
      const { fileID, tempUrl } = await uploadAndGetUrl(cloudPath, compressedPath)
      
      const mealTypeMessage = createMealTypeSelectMessage(tempUrl, fileID)
      
      this.setData({
        messages: [...this.data.messages, mealTypeMessage],
        currentImageUrl: tempUrl,
        currentCloudFileId: fileID
      })
      this.saveChatMessages()
      this.scrollToBottom()
      
      this.startRecognition(tempUrl, fileID, mealTypeMessage.id)
      
    } catch (error) {
      console.error('Image process error:', error)
      this.showErrorMessage('图片处理失败，请重试')
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  startRecognition: async function(imageUrl, cloudFileId, mealTypeMsgId) {
    const recognitionTask = {
      imageUrl,
      cloudFileId,
      mealTypeMsgId,
      startTime: Date.now()
    }
    
    this.setData({
      recognizingTasks: {
        ...this.data.recognizingTasks,
        [imageUrl]: recognitionTask
      }
    })
    
    try {
      const recognizeResult = await safeApiCall(() => api.food.recognize(imageUrl))
      
      const task = this.data.recognizingTasks[imageUrl]
      if (task) {
        task.result = recognizeResult
        task.completed = true
        this.setData({
          recognizingTasks: {
            ...this.data.recognizingTasks,
            [imageUrl]: task
          }
        })
        
        this.checkAndShowResult(imageUrl)
      }
    } catch (error) {
      console.error('Recognition error:', error)
      const task = this.data.recognizingTasks[imageUrl]
      if (task) {
        task.error = error
        task.completed = true
        this.setData({
          recognizingTasks: {
            ...this.data.recognizingTasks,
            [imageUrl]: task
          }
        })
      }
    }
  },

  checkAndShowResult: function(imageUrl) {
    const task = this.data.recognizingTasks[imageUrl]
    if (!task || !task.completed || !task.selectedMealType || task.selectedRating === null || task.resultShown) {
      return
    }
    
    const recognizeResult = task.result
    if (!recognizeResult.success || !recognizeResult.foods) {
      this.showErrorMessage(recognizeResult.message || recognizeResult.error || '无法识别图片中的食物')
      return
    }
    
    const foods = recognizeResult.foods
    foods.forEach(food => {
      food.imageUrl = task.cloudFileId
    })
    
    const mealOverview = recognizeResult.mealOverview || {
      totalCalories: foods.reduce((sum, f) => sum + (f.nutrients?.calories || f.nutrientsEstimation?.calories || 0), 0),
      overallHealthScore: 60,
      healthTags: { positive: [], warning: [] },
      summary: '识别成功'
    }
    
    const dietaryAdvice = recognizeResult.dietaryAdvice || ''
    
    const foodCardMessage = createFoodCardMessage(foods, mealOverview, dietaryAdvice, generateId())
    foodCardMessage.data.imageUrl = imageUrl
    foodCardMessage.data.mealType = task.selectedMealType
    foodCardMessage.data.rating = task.selectedRating
    foodCardMessage.data.cloudFileId = task.cloudFileId
    
    this.setData({
      messages: [...this.data.messages, foodCardMessage],
      currentFoods: foods,
      currentMealOverview: mealOverview
    })
    this.saveChatMessages()
    this.scrollToBottom()
    
    task.resultShown = true
    this.setData({
      recognizingTasks: {
        ...this.data.recognizingTasks,
        [imageUrl]: task
      }
    })
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
        this.saveChatMessages()
      }
    } catch (error) {
      this.showErrorMessage('获取建议失败，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  onMealTypeSelect: function(e) {
    const { value, msgId } = e.currentTarget.dataset
    const messages = this.data.messages.map(msg => {
      if (msg.id === msgId) {
        return { 
          ...msg, 
          data: { 
            ...msg.data, 
            selectedMealType: value,
            collapsed: true
          } 
        }
      }
      return msg
    })
    
    const mealTypeMsg = messages.find(m => m.id === msgId)
    const { imageUrl, cloudFileId } = mealTypeMsg.data
    
    const ratingMessage = createRatingSelectMessage(imageUrl, cloudFileId, value)
    
    this.setData({ 
      messages: [...messages, ratingMessage],
      selectedMealType: value 
    })
    this.saveChatMessages()
    
    setTimeout(() => {
      this.scrollToBottom()
    }, 300)
  },

  onRatingSelect: function(e) {
    const { value, msgId } = e.currentTarget.dataset
    const messages = this.data.messages.map(msg => {
      if (msg.id === msgId) {
        return { 
          ...msg, 
          data: { 
            ...msg.data, 
            selectedRating: value,
            collapsed: true
          } 
        }
      }
      return msg
    })
    
    const ratingMsg = messages.find(m => m.id === msgId)
    const { imageUrl, selectedMealType } = ratingMsg.data
    
    const task = this.data.recognizingTasks[imageUrl]
    if (task) {
      task.selectedMealType = selectedMealType
      task.selectedRating = value
      this.setData({
        messages,
        recognizingTasks: {
          ...this.data.recognizingTasks,
          [imageUrl]: task
        }
      })
      this.saveChatMessages()
      
      if (task.completed && !task.resultShown) {
        this.checkAndShowResult(imageUrl)
      } else if (!task.completed) {
        const waitingMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          '⏳ AI正在识别中，请稍候...'
        )
        this.setData({
          messages: [...messages, waitingMessage]
        })
        this.saveChatMessages()
        this.scrollToBottom()
      }
    } else {
      this.setData({ messages })
      this.saveChatMessages()
    }
  },

  onFoodCardConfirm: async function(e) {
    const { foods, mealOverview, dietaryAdvice } = e.detail
    
    let foodCardIndex = -1
    let foodCardMsg = null
    
    for (let i = this.data.messages.length - 1; i >= 0; i--) {
      const msg = this.data.messages[i]
      if (msg.type === MESSAGE_TYPES.FOOD_CARD) {
        foodCardIndex = i
        foodCardMsg = msg
        break
      }
    }
    
    const mealType = foodCardMsg?.data?.mealType || this.getCurrentMealType()
    const rating = foodCardMsg?.data?.rating || 0
    const imageUrl = foodCardMsg?.data?.imageUrl || foodCardMsg?.data?.cloudFileId || this.data.currentImageUrl
    
    const messages = this.data.messages.map((msg, index) => {
      if (index === foodCardIndex) {
        return { 
          ...msg, 
          data: { 
            ...msg.data, 
            actionCompleted: true
          } 
        }
      }
      return msg
    })
    
    this.setData({ 
      messages: messages,
      isLoading: true 
    })
    this.saveChatMessages()
    this.scrollToBottom()
    
    const record = {
      date: formatDate(new Date()),
      mealType: mealType,
      rating: rating,
      foods: foods,
      totalCalories: mealOverview.totalCalories,
      imageUrl: imageUrl,
      mealOverview: mealOverview
    }
    
    try {
      const saveResult = await safeApiCall(() => api.food.addRecord(record))
      
      const updatedMessages = this.data.messages.map((msg, index) => {
        if (index === foodCardIndex) {
          return { 
            ...msg, 
            data: { 
              ...msg.data, 
              recordSaved: true,
              recordId: saveResult?.recordId
            } 
          }
        }
        return msg
      })
      
      const successMessage = createTextMessage(
        MESSAGE_ROLES.ASSISTANT,
        `✅ 已记录为${this.getMealTypeLabel(mealType)}！\n\n本餐热量：${mealOverview.totalCalories} kcal\n健康评分：${mealOverview.overallHealthScore || 60}分\n您的评分：${rating === 0 ? '待定' : rating + '星'}`
      )
      
      this.setData({
        messages: [...updatedMessages, successMessage],
        currentFoods: foods,
        currentMealOverview: mealOverview
      })
      this.saveChatMessages()
      this.updateDailyProgress()
      this.scrollToBottom()
    } catch (error) {
      console.error('Save record error:', error)
      this.showErrorMessage('保存记录失败，请重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  onFoodCardEdit: function(e) {
    const { foods, mealOverview } = e.detail
    
    let foodCardIndex = -1
    let foodCardMsg = null
    
    for (let i = this.data.messages.length - 1; i >= 0; i--) {
      const msg = this.data.messages[i]
      if (msg.type === MESSAGE_TYPES.FOOD_CARD) {
        foodCardIndex = i
        foodCardMsg = msg
        break
      }
    }
    
    const imageUrl = foodCardMsg?.data?.imageUrl || this.data.currentImageUrl
    
    const feedbackMessage = createFeedbackInputMessage(foods, mealOverview, imageUrl)
    
    const messages = this.data.messages.map((msg, index) => {
      if (index === foodCardIndex) {
        return { ...msg, data: { ...msg.data, actionCompleted: true } }
      }
      return msg
    })
    
    this.setData({
      messages: [...messages, feedbackMessage],
      currentImageUrl: imageUrl,
      editingFoodCardIndex: foodCardIndex
    })
    this.saveChatMessages()
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
        this.saveChatMessages()
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
    const { editingFoodCardIndex } = this.data
    
    if (!imageUrl) {
      this.showErrorMessage('请重新上传图片')
      return
    }
    
    const messages = this.data.messages.map(msg => {
      if (msg.type === MESSAGE_TYPES.FEEDBACK_INPUT) {
        return { ...msg, data: { ...msg.data, completed: true } }
      }
      return msg
    })
    
    const feedbackText = createTextMessage(MESSAGE_ROLES.USER, `反馈：${feedback}`)
    
    this.setData({ 
      messages: [...messages, feedbackText],
      isLoading: true 
    })
    this.saveChatMessages()
    this.scrollToBottom()
    
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
        foodCardMessage.data.imageUrl = imageUrl
        
        this.setData({
          messages: [...this.data.messages, foodCardMessage],
          currentFoods: newFoods,
          currentMealOverview: newMealOverview,
          currentImageUrl: imageUrl,
          editingFoodCardIndex: -1
        })
        this.saveChatMessages()
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
        this.saveChatMessages()
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
    this.saveChatMessages()
  },

  scrollToBottom: function() {
    const messages = this.data.messages
    if (messages.length > 0) {
      const lastMsgId = `msg-${messages[messages.length - 1].id}`
      
      this.setData({
        scrollTop: 999999,
        scrollToView: lastMsgId
      })
      
      setTimeout(() => {
        this.setData({
          scrollTop: 999999,
          scrollToView: lastMsgId
        })
      }, 100)
      
      setTimeout(() => {
        this.setData({
          scrollTop: 999999,
          scrollToView: lastMsgId
        })
      }, 300)
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
