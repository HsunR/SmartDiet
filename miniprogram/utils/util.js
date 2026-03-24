const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatDate = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${formatNumber(month)}-${formatNumber(day)}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const formatTimeAgo = timestamp => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前'
  } else if (diff < 604800000) {
    return Math.floor(diff / 86400000) + '天前'
  } else {
    const date = new Date(timestamp)
    return formatDate(date)
  }
}

const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

const throttle = (fn, delay = 300) => {
  let last = 0
  return function(...args) {
    const now = Date.now()
    if (now - last > delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (obj instanceof Object) {
    const copy = {}
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key])
    })
    return copy
  }
}

const formatCalories = calories => {
  if (calories >= 1000) {
    return (calories / 1000).toFixed(1) + 'k'
  }
  return Math.round(calories)
}

const formatNutrient = (value, unit = 'g') => {
  if (value === undefined || value === null) return '-'
  if (value < 0.1) return '<0.1' + unit
  return value.toFixed(1) + unit
}

const getMealTypeName = mealType => {
  const types = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐'
  }
  return types[mealType] || '未知'
}

const getNutrientName = nutrient => {
  const names = {
    calories: '热量',
    protein: '蛋白质',
    fat: '脂肪',
    carbohydrate: '碳水化合物',
    fiber: '膳食纤维',
    vitaminA: '维生素A',
    vitaminC: '维生素C',
    vitaminD: '维生素D',
    vitaminE: '维生素E',
    calcium: '钙',
    iron: '铁',
    sodium: '钠',
    potassium: '钾'
  }
  return names[nutrient] || nutrient
}

const getNutrientUnit = nutrient => {
  const units = {
    calories: 'kcal',
    protein: 'g',
    fat: 'g',
    carbohydrate: 'g',
    fiber: 'g',
    vitaminA: 'μg',
    vitaminC: 'mg',
    vitaminD: 'μg',
    vitaminE: 'mg',
    calcium: 'mg',
    iron: 'mg',
    sodium: 'mg',
    potassium: 'mg'
  }
  return units[nutrient] || 'g'
}

const calculateProgress = (current, target) => {
  if (!target || target === 0) return 0
  const progress = (current / target) * 100
  return Math.min(Math.max(progress, 0), 150)
}

const getProgressStatus = progress => {
  if (progress < 50) return 'warning'
  if (progress <= 100) return 'success'
  if (progress <= 110) return 'warning'
  return 'error'
}

const validateNumber = (value, min, max) => {
  const num = parseFloat(value)
  if (isNaN(num)) return false
  if (min !== undefined && num < min) return false
  if (max !== undefined && num > max) return false
  return true
}

const getImageUrl = (path, options = {}) => {
  if (!path) return ''
  if (path.startsWith('cloud://')) {
    return path
  }
  return path
}

const compressImage = (tempFilePath, quality = 80) => {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: tempFilePath,
      quality: quality,
      success: res => resolve(res.tempFilePath),
      fail: err => reject(err)
    })
  })
}

const uploadFile = (cloudPath, filePath) => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => resolve(res.fileID),
      fail: err => reject(err)
    })
  })
}

const getTempFileURL = (fileID) => {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        if (res.fileList && res.fileList.length > 0) {
          resolve(res.fileList[0].tempFileURL)
        } else {
          reject(new Error('获取临时链接失败'))
        }
      },
      fail: err => reject(err)
    })
  })
}

const uploadAndGetUrl = async (cloudPath, filePath) => {
  const fileID = await uploadFile(cloudPath, filePath)
  const tempUrl = await getTempFileURL(fileID)
  return { fileID, tempUrl }
}

module.exports = {
  formatTime,
  formatDate,
  formatNumber,
  formatTimeAgo,
  generateId,
  debounce,
  throttle,
  deepClone,
  formatCalories,
  formatNutrient,
  getMealTypeName,
  getNutrientName,
  getNutrientUnit,
  calculateProgress,
  getProgressStatus,
  validateNumber,
  getImageUrl,
  compressImage,
  uploadFile,
  getTempFileURL,
  uploadAndGetUrl
}
