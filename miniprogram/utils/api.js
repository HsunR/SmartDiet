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

/**
 * 流式请求 - 使用 enableChunked 实现 SSE 流式接收
 * @param {string} path - API 路径
 * @param {object} data - 请求数据
 * @param {function} onChunk - 收到数据块回调 (content: string) => void
 * @param {function} onDone - 流式结束回调 () => void
 * @param {function} onError - 错误回调 (error: string) => void
 * @returns {object} requestTask - 可用于中断请求
 */
const streamRequest = (path, data, onChunk, onDone, onError) => {
  let buffer = ''
  
  const requestTask = wx.request({
    url: `${API_BASE_URL}${path}`,
    method: 'POST',
    data,
    responseType: 'arraybuffer',
    enableChunked: true,
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    success: res => {
      // 流式结束时的最终回调
      if (onDone) onDone()
    },
    fail: err => {
      let msg = '网络异常'
      if (err.errMsg?.includes('timeout')) msg = '请求超时'
      else if (err.errMsg?.includes('fail')) msg = '请求失败'
      if (onError) onError(msg)
    },
  })

  // 监听数据分块接收事件
  requestTask.onChunkReceived(response => {
    try {
      const text = new TextDecoder('utf-8').decode(response.data)
      
      // 处理 SSE 格式数据
      buffer += text
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留未完成的行
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr)
              if (parsed.done) {
                if (onDone) onDone()
              } else if (parsed.content) {
                if (onChunk) onChunk(parsed.content)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('onChunkReceived error:', error)
    }
  })

  return requestTask
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
    recognize: (imageUrl, userFeedback) => request('POST', '/records/recognize', { imageUrl, userFeedback: userFeedback || '' }),
    /**
     * 流式食物识别 - 使用 SSE 实时返回识别结果
     * @param {string} imageUrl - 图片URL
     * @param {function} onOverview - 收到餐食概览回调 (data) => void
     * @param {function} onFoodItem - 收到单个食物回调 (data) => void
     * @param {function} onDone - 识别完成回调 (data) => void
     * @param {function} onError - 错误回调 (message) => void
     * @returns {object} requestTask
     */
    recognizeStream: (imageUrl, onOverview, onFoodItem, onDone, onError) => {
      let buffer = ''

      const requestTask = wx.request({
        url: `${API_BASE_URL}/records/recognize/stream`,
        method: 'POST',
        data: { imageUrl },
        responseType: 'arraybuffer',
        enableChunked: true,
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        success: res => { },
        fail: err => {
          let msg = '网络异常'
          if (err.errMsg?.includes('timeout')) msg = '请求超时'
          else if (err.errMsg?.includes('fail')) msg = '请求失败'
          if (onError) onError(msg)
        },
      })

      requestTask.onChunkReceived(response => {
        try {
          const text = new TextDecoder('utf-8').decode(response.data)

          buffer += text
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue
              try {
                const parsed = JSON.parse(jsonStr)
                switch (parsed.type) {
                  case 'overview':
                    if (onOverview) onOverview(parsed.data)
                    break
                  case 'food_item':
                    if (onFoodItem) onFoodItem(parsed.data)
                    break
                  case 'done':
                    if (onDone) onDone(parsed.data)
                    break
                  case 'error':
                    if (onError) onError(parsed.data?.message || '识别失败')
                    break
                }
              } catch (e) { }
            }
          }
        } catch (error) {
          console.error('recognizeStream onChunkReceived error:', error)
        }
      })

      return requestTask
    },
    addRecord: record => request('POST', '/records', record),
    getRecords: date => request('GET', `/records?date=${date}`),
    getHistory: (startDate, endDate) => request('GET', `/records/history?start=${startDate}&end=${endDate}`),
    deleteRecord: recordId => request('DELETE', `/records/${recordId}`),
    updateRecord: (recordId, data) => request('PATCH', `/records/${recordId}`, data),
  },
  chat: {
    send: (message, context) => request('POST', '/chat/messages', { content: message, context }),
    sendStream: (message, conversationId, onChunk, onDone, onError) => {
      return streamRequest('/chat/messages/stream', { content: message, conversation_id: conversationId }, onChunk, onDone, onError)
    },
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
