const { API_BASE_URL, STORAGE_KEYS } = require('./constants')

const getToken = () => wx.getStorageSync('token') || ''

const request = (method, path, data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: res.data })
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
        } else {
          const msg = res.data?.detail?.message || res.data?.message || '请求失败'
          resolve({ success: false, error: msg, data: res.data })
        }
      },
      fail: err => {
        let msg = '网络异常'
        if (err.errMsg?.includes('timeout')) msg = '请求超时'
        else if (err.errMsg?.includes('fail')) msg = '请求失败'
        resolve({ success: false, error: msg })
      },
    })
  })
}

const api = {
  user: {
    login: code => request('POST', '/users/login', { code }),
    getInfo: () => request('GET', '/users/me'),
    updateInfo: data => request('PATCH', '/users/me', data),
    getProfile: () => request('GET', '/users/me'),
    updateProfile: profile => request('PATCH', '/users/me', profile),
  },
  food: {
    recognize: imageUrl => request('POST', '/records/recognize', { imageUrl }),
    addRecord: record => request('POST', '/records', record),
    getRecords: date => request('GET', `/records?date=${date}`),
    getHistory: (startDate, endDate) => request('GET', `/records/history?start=${startDate}&end=${endDate}`),
    deleteRecord: recordId => request('DELETE', `/records/${recordId}`),
    updateRecord: (recordId, data) => request('PATCH', `/records/${recordId}`, data),
  },
  chat: {
    send: (message, context) => request('POST', '/chat/messages', { content: message, context }),
  },
  upload: tempFilePath => {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${API_BASE_URL}/upload`,
        filePath: tempFilePath,
        name: 'file',
        header: { 'Authorization': `Bearer ${getToken()}` },
        success: res => {
          try {
            const data = JSON.parse(res.data)
            resolve({ success: true, data })
          } catch {
            resolve({ success: true, data: { url: res.data } })
          }
        },
        fail: err => resolve({ success: false, error: '上传失败' }),
      })
    })
  },
}

const safeApiCall = async apiCall => {
  try {
    const result = await apiCall()
    return result
  } catch (error) {
    return { success: false, error: error.message || '调用失败' }
  }
}

module.exports = { api, safeApiCall }
