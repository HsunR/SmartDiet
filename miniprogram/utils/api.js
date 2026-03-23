const cloud = {
  callFunction: (name, data) => {
    return wx.cloud.callFunction({
      name,
      data
    })
  },
  
  getDatabase: () => {
    return wx.cloud.database()
  },
  
  uploadFile: (cloudPath, filePath) => {
    return wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
  },
  
  downloadFile: (fileID) => {
    return wx.cloud.downloadFile({
      fileID
    })
  },
  
  deleteFile: (fileList) => {
    return wx.cloud.deleteFile({
      fileList
    })
  },
  
  getTempFileURL: (fileList) => {
    return wx.cloud.getTempFileURL({
      fileList
    })
  }
}

const api = {
  user: {
    login: () => cloud.callFunction('user', { action: 'login' }),
    
    getInfo: () => cloud.callFunction('user', { action: 'getInfo' }),
    
    updateInfo: (data) => cloud.callFunction('user', { action: 'updateInfo', data }),
    
    getProfile: () => cloud.callFunction('user', { action: 'getProfile' }),
    
    updateProfile: (profile) => cloud.callFunction('user', { action: 'updateProfile', data: { profile } })
  },
  
  food: {
    recognize: (imageUrl) => cloud.callFunction('aiGateway', { 
      action: 'foodRecognition', 
      data: { imageUrl } 
    }),
    
    analyzeNutrition: (foodInfo, userInfo) => cloud.callFunction('aiGateway', { 
      action: 'nutritionAnalysis', 
      data: { foodInfo, userInfo } 
    }),
    
    addRecord: (record) => cloud.callFunction('foodRecord', { 
      action: 'add', 
      data: record 
    }),
    
    getRecords: (date) => cloud.callFunction('foodRecord', { 
      action: 'getByDate', 
      data: { date } 
    }),
    
    getHistory: (startDate, endDate) => cloud.callFunction('foodRecord', { 
      action: 'getHistory', 
      data: { startDate, endDate } 
    }),
    
    deleteRecord: (recordId) => cloud.callFunction('foodRecord', { 
      action: 'delete', 
      data: { recordId } 
    }),
    
    updateRecord: (recordId, data) => cloud.callFunction('foodRecord', { 
      action: 'update', 
      data: { recordId, ...data } 
    })
  },
  
  chat: {
    send: (message, context) => cloud.callFunction('aiGateway', { 
      action: 'chat', 
      data: { message, context } 
    }),
    
    getHistory: (sessionId) => cloud.callFunction('chat', { 
      action: 'getHistory', 
      data: { sessionId } 
    })
  },
  
  report: {
    getDaily: (date) => cloud.callFunction('report', { 
      action: 'getDaily', 
      data: { date } 
    }),
    
    getWeekly: (startDate) => cloud.callFunction('report', { 
      action: 'getWeekly', 
      data: { startDate } 
    }),
    
    analyzeGaps: (date) => cloud.callFunction('report', { 
      action: 'analyzeGaps', 
      data: { date } 
    })
  },
  
  recommend: {
    getFoodRecommendation: (gaps, preferences) => cloud.callFunction('aiGateway', { 
      action: 'recommendation', 
      data: { gaps, preferences } 
    }),
    
    getHealthAdvice: (userProfile, recentRecords) => cloud.callFunction('aiGateway', { 
      action: 'healthAdvice', 
      data: { userProfile, recentRecords } 
    })
  }
}

const showError = (title, message) => {
  wx.showToast({
    title: title || '请求失败',
    icon: 'none',
    duration: 2000
  })
  console.error('API Error:', message)
}

const handleApiError = (error) => {
  console.error('API Error:', error)
  
  if (error.errMsg && error.errMsg.includes('timeout')) {
    showError('请求超时', '请检查网络后重试')
  } else if (error.errMsg && error.errMsg.includes('network')) {
    showError('网络错误', '请检查网络连接')
  } else {
    showError('操作失败', error.message || '请稍后重试')
  }
  
  return {
    success: false,
    error: error.message || 'Unknown error'
  }
}

const safeApiCall = async (apiCall) => {
  try {
    const result = await apiCall()
    if (result.errMsg === 'cloud.callFunction:ok' || result.result) {
      return result.result || result
    }
    return handleApiError(result)
  } catch (error) {
    return handleApiError(error)
  }
}

module.exports = {
  cloud,
  api,
  showError,
  handleApiError,
  safeApiCall
}
