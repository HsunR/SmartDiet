const { formatDate, generateId, compressImage, uploadFile } = require('../../utils/util')
const { MEAL_TYPES, FOOD_CATEGORIES } = require('../../utils/constants')
const { api, safeApiCall } = require('../../utils/api')

Page({
  data: {
    imageSrc: '',
    foods: [],
    isRecognizing: false,
    isSaving: false,
    mealType: 'breakfast',
    mealTypes: [
      { value: 'breakfast', label: '早餐' },
      { value: 'lunch', label: '午餐' },
      { value: 'dinner', label: '晚餐' },
      { value: 'snack', label: '加餐' }
    ],
    currentFoodIndex: 0,
    showFoodEditor: false,
    editingFood: null
  },

  onLoad: function(options) {
    if (options.foods) {
      try {
        const foods = JSON.parse(decodeURIComponent(options.foods))
        this.setData({ foods })
      } catch (e) {
        console.error('Parse foods error:', e)
      }
    }
    
    this.setData({
      mealType: this.getCurrentMealType()
    })
  },

  getCurrentMealType: function() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return 'breakfast'
    if (hour >= 11 && hour < 14) return 'lunch'
    if (hour >= 17 && hour < 20) return 'dinner'
    return 'snack'
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
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: sourceType,
        sizeType: ['compressed']
      })
      
      const tempFilePath = result.tempFiles[0].tempFilePath
      this.setData({
        imageSrc: tempFilePath,
        foods: [],
        isRecognizing: true
      })
      
      await this.recognizeImage(tempFilePath)
    } catch (error) {
      console.error('Choose image error:', error)
    }
  },

  recognizeImage: async function(imagePath) {
    try {
      const compressedPath = await compressImage(imagePath, 80)
      const cloudPath = `food_images/${generateId()}.jpg`
      const fileID = await uploadFile(cloudPath, compressedPath)
      
      const result = await safeApiCall(() => api.food.recognize(fileID))
      
      if (result.success && result.foods && result.foods.length > 0) {
        const foods = result.foods.map(food => ({
          ...food,
          nutrients: food.nutrients || this.getDefaultNutrients(food)
        }))
        
        this.setData({
          foods,
          isRecognizing: false
        })
      } else {
        wx.showToast({
          title: '未能识别食物',
          icon: 'none'
        })
        this.setData({ isRecognizing: false })
      }
    } catch (error) {
      console.error('Recognize error:', error)
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      })
      this.setData({ isRecognizing: false })
    }
  },

  getDefaultNutrients: function(food) {
    const baseCalories = 100
    return {
      calories: baseCalories,
      protein: 5,
      fat: 3,
      carbohydrate: 15,
      fiber: 2
    }
  },

  onMealTypeChange: function(e) {
    const index = e.detail.value
    this.setData({
      mealType: this.data.mealTypes[index].value
    })
  },

  onFoodPortionChange: function(e) {
    const { index } = e.currentTarget.dataset
    const portion = parseFloat(e.detail.value) || 0
    const foods = this.data.foods
    const food = foods[index]
    
    const ratio = portion / (food.estimatedWeight || 100)
    food.estimatedWeight = portion
    food.nutrients = {
      calories: Math.round((food.baseNutrients?.calories || 100) * ratio),
      protein: Math.round((food.baseNutrients?.protein || 5) * ratio * 10) / 10,
      fat: Math.round((food.baseNutrients?.fat || 3) * ratio * 10) / 10,
      carbohydrate: Math.round((food.baseNutrients?.carbohydrate || 15) * ratio * 10) / 10
    }
    
    this.setData({ foods })
  },

  editFood: function(e) {
    const { index } = e.currentTarget.dataset
    const food = this.data.foods[index]
    
    this.setData({
      currentFoodIndex: index,
      editingFood: { ...food },
      showFoodEditor: true
    })
  },

  onFoodNameChange: function(e) {
    const editingFood = this.data.editingFood
    editingFood.name = e.detail.value
    this.setData({ editingFood })
  },

  onEditorPortionChange: function(e) {
    const editingFood = this.data.editingFood
    editingFood.estimatedWeight = parseFloat(e.detail.value) || 0
    this.setData({ editingFood })
  },

  saveFoodEdit: function() {
    const { foods, currentFoodIndex, editingFood } = this.data
    foods[currentFoodIndex] = editingFood
    this.setData({
      foods,
      showFoodEditor: false,
      editingFood: null
    })
  },

  cancelFoodEdit: function() {
    this.setData({
      showFoodEditor: false,
      editingFood: null
    })
  },

  deleteFood: function(e) {
    const { index } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个食物吗？',
      success: (res) => {
        if (res.confirm) {
          const foods = this.data.foods
          foods.splice(index, 1)
          this.setData({ foods })
        }
      }
    })
  },

  addFood: function() {
    const foods = this.data.foods
    foods.push({
      name: '新食物',
      category: 'other',
      estimatedWeight: 100,
      confidence: 1,
      nutrients: this.getDefaultNutrients({}),
      baseNutrients: this.getDefaultNutrients({})
    })
    this.setData({ foods })
  },

  getTotalNutrients: function() {
    const { foods } = this.data
    return foods.reduce((total, food) => {
      const nutrients = food.nutrients || {}
      return {
        calories: total.calories + (nutrients.calories || 0),
        protein: total.protein + (nutrients.protein || 0),
        fat: total.fat + (nutrients.fat || 0),
        carbohydrate: total.carbohydrate + (nutrients.carbohydrate || 0)
      }
    }, { calories: 0, protein: 0, fat: 0, carbohydrate: 0 })
  },

  saveRecord: async function() {
    const { foods, mealType, imageSrc } = this.data
    
    if (foods.length === 0) {
      wx.showToast({
        title: '请先添加食物',
        icon: 'none'
      })
      return
    }
    
    this.setData({ isSaving: true })
    
    try {
      let imageUrl = imageSrc
      if (imageSrc && !imageSrc.startsWith('cloud://')) {
        const cloudPath = `food_images/${generateId()}.jpg`
        imageUrl = await uploadFile(cloudPath, imageSrc)
      }
      
      const record = {
        date: formatDate(new Date()),
        mealType,
        foods,
        totalCalories: this.getTotalNutrients().calories,
        nutrients: this.getTotalNutrients(),
        imageUrl
      }
      
      const result = await safeApiCall(() => api.food.addRecord(record))
      
      if (result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/report/index'
          })
        }, 1500)
      }
    } catch (error) {
      console.error('Save record error:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isSaving: false })
    }
  },

  onShareAppMessage: function() {
    return {
      title: 'AI营养师 - 食物识别',
      path: '/pages/recognize/index'
    }
  }
})
