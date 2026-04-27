/**
 * @fileoverview 云开发API封装模块
 * @description 提供统一的云函数调用、安全调用包装器和业务API接口封装
 * @module utils/api
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const { api, safeApiCall, cloud } = require('./api');
 * 
 * // 调用用户登录
 * const result = await safeApiCall(() => api.user.login());
 * 
 * // 上传文件到云存储
 * const fileID = await cloud.uploadFile('images/photo.jpg', tempFilePath);
 */

/**
 * API错误类 - 用于封装API调用中的错误信息
 * @class ApiError
 * @extends Error
 * @example
 * throw new ApiError('用户未登录', 401, { userId: null });
 */
class ApiError extends Error {
  /**
   * 创建API错误实例
   * @param {string} message - 错误消息
   * @param {number} [code=-1] - 错误代码
   * @param {*} [data=null] - 附加错误数据
   */
  constructor(message, code = -1, data = null) {
    super(message)
    /**
     * 错误代码
     * @type {number}
     */
    this.code = code
    /**
     * 附加错误数据
     * @type {*}
     */
    this.data = data
    /**
     * 错误名称
     * @type {string}
     */
    this.name = 'ApiError'
  }
}

/**
 * 云开发基础操作封装对象
 * @namespace cloud
 * @property {Function} callFunction - 调用云函数
 * @property {Function} getDatabase - 获取数据库实例
 * @property {Function} uploadFile - 上传文件
 * @property {Function} downloadFile - 下载文件
 * @property {Function} deleteFile - 删除文件
 * @property {Function} getTempFileURL - 获取临时文件链接
 * @example
 * // 调用云函数
 * const result = await cloud.callFunction('user', { action: 'login' });
 * 
 * // 获取数据库
 * const db = cloud.getDatabase();
 * 
 * // 上传文件
 * const fileID = await cloud.uploadFile('cloud/path.jpg', 'local/path.jpg');
 */
const cloud = {
  /**
   * 调用云函数
   * @param {string} name - 云函数名称
   * @param {Object} data - 传递给云函数的参数
   * @returns {Promise<Object>} 云函数返回结果
   * @example
   * const result = await cloud.callFunction('user', { action: 'getInfo' });
   */
  callFunction: (name, data) => {
    return wx.cloud.callFunction({ name, data })
  },
  
  /**
   * 获取云开发数据库实例
   * @returns {Object} 数据库实例
   * @example
   * const db = cloud.getDatabase();
   * const collection = db.collection('users');
   */
  getDatabase: () => {
    return wx.cloud.database()
  },
  
  /**
   * 上传文件到云存储
   * @param {string} cloudPath - 云存储路径
   * @param {string} filePath - 本地文件路径
   * @returns {Promise<Object>} 上传结果，包含fileID
   * @example
   * const result = await cloud.uploadFile('images/avatar.jpg', wx.env.USER_DATA_PATH + '/avatar.jpg');
   * console.log(result.fileID);
   */
  uploadFile: (cloudPath, filePath) => {
    return wx.cloud.uploadFile({ cloudPath, filePath })
  },
  
  /**
   * 从云存储下载文件
   * @param {string} fileID - 云文件ID
   * @returns {Promise<Object>} 下载结果，包含临时文件路径
   * @example
   * const result = await cloud.downloadFile('cloud://env/file.jpg');
   * console.log(result.tempFilePath);
   */
  downloadFile: fileID => {
    return wx.cloud.downloadFile({ fileID })
  },
  
  /**
   * 删除云存储中的文件
   * @param {string[]} fileList - 要删除的文件ID数组
   * @returns {Promise<Object>} 删除结果
   * @example
   * await cloud.deleteFile(['cloud://env/file1.jpg', 'cloud://env/file2.jpg']);
   */
  deleteFile: fileList => {
    return wx.cloud.deleteFile({ fileList })
  },
  
  /**
   * 获取云文件的临时下载链接
   * @param {string[]} fileList - 文件ID数组
   * @returns {Promise<Object>} 包含临时链接的结果
   * @example
   * const result = await cloud.getTempFileURL(['cloud://env/file.jpg']);
   * console.log(result.fileList[0].tempFileURL);
   */
  getTempFileURL: fileList => {
    return wx.cloud.getTempFileURL({ fileList })
  }
}

/**
 * 安全API调用包装器 - 统一处理错误和响应格式
 * @async
 * @param {Function} apiCall - 返回Promise的API调用函数
 * @returns {Promise<{success: boolean, data?: *, error?: string}>} 标准化的响应对象
 * @example
 * // 成功示例
 * const result = await safeApiCall(() => api.user.getInfo());
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * 
 * // 错误处理示例
 * const result = await safeApiCall(() => api.food.recognize(imageUrl));
 * if (!result.success) {
 *   wx.showToast({ title: result.error, icon: 'none' });
 * }
 */
const safeApiCall = async apiCall => {
  try {
    const result = await apiCall()
    
    if (result.result) {
      const res = result.result
      if (res.success === false) {
        return {
          success: false,
          error: res.error || res.message || '操作失败',
          data: res.data
        }
      }
      return { success: true, data: res.data || res.result || res }
    }
    
    return { success: false, error: result.error || '调用失败' }
  } catch (error) {
    console.error('API Error:', error)
    
    let errorMessage = '网络异常'
    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        errorMessage = '请求超时'
      } else if (error.errMsg.includes('network')) {
        errorMessage = '网络错误'
      } else if (error.errMsg.includes('fail')) {
        errorMessage = '请求失败'
      }
    }
    
    return {
      success: false,
      error: error.message || errorMessage
    }
  }
}

/**
 * 业务API接口封装对象
 * @namespace api
 * @property {Object} user - 用户相关API
 * @property {Object} food - 食物相关API
 * @property {Object} chat - 聊天相关API
 * @example
 * // 用户登录
 * const loginResult = await api.user.login();
 * 
 * // 识别食物
 * const recognizeResult = await api.food.recognize(imageUrl);
 * 
 * // 发送聊天消息
 * const chatResult = await api.chat.send('你好', []);
 */
const api = {
  /**
   * 用户相关API
   * @namespace
   */
  user: {
    /**
     * 用户登录
     * @returns {Promise<Object>} 登录结果
     * @example
     * const result = await api.user.login();
     * console.log(result.result.openid);
     */
    login: () => cloud.callFunction('user', { action: 'login' }),
    
    /**
     * 获取用户信息
     * @returns {Promise<Object>} 用户信息
     * @example
     * const result = await api.user.getInfo();
     * console.log(result.result.nickName);
     */
    getInfo: () => cloud.callFunction('user', { action: 'getInfo' }),
    
    /**
     * 更新用户信息
     * @param {Object} data - 要更新的用户数据
     * @returns {Promise<Object>} 更新结果
     * @example
     * await api.user.updateInfo({ nickName: '新昵称', avatarUrl: '...' });
     */
    updateInfo: data => cloud.callFunction('user', { action: 'updateInfo', data }),
    
    /**
     * 获取用户档案
     * @returns {Promise<Object>} 用户档案
     * @example
     * const result = await api.user.getProfile();
     * console.log(result.result.age, result.result.weight);
     */
    getProfile: () => cloud.callFunction('user', { action: 'getProfile' }),
    
    /**
     * 更新用户档案
     * @param {Object} profile - 用户档案数据
     * @returns {Promise<Object>} 更新结果
     * @example
     * await api.user.updateProfile({ age: 25, weight: 70, height: 175 });
     */
    updateProfile: profile => cloud.callFunction('user', { action: 'updateProfile', data: { profile } })
  },
  
  /**
   * 食物相关API
   * @namespace
   */
  food: {
    /**
     * 识别食物图片
     * @param {string} imageUrl - 图片URL
     * @returns {Promise<Object>} 识别结果
     * @example
     * const result = await api.food.recognize('cloud://env/food.jpg');
     * console.log(result.result.foods);
     */
    recognize: imageUrl => cloud.callFunction('aiGateway', { 
      action: 'foodRecognition', 
      data: { imageUrl } 
    }),
    
    /**
     * 带用户反馈的食物识别
     * @param {string} imageUrl - 图片URL
     * @param {string} userFeedback - 用户反馈文本
     * @returns {Promise<Object>} 识别结果
     * @example
     * const result = await api.food.recognizeWithFeedback('cloud://env/food.jpg', '这是红烧肉不是糖醋排骨');
     */
    recognizeWithFeedback: (imageUrl, userFeedback) => cloud.callFunction('aiGateway', { 
      action: 'foodRecognition', 
      data: { imageUrl, userFeedback } 
    }),
    
    /**
     * 添加食物记录
     * @param {Object} record - 食物记录数据
     * @returns {Promise<Object>} 添加结果
     * @example
     * await api.food.addRecord({
     *   foodName: '米饭',
     *   calories: 200,
     *   mealType: 'lunch',
     *   date: '2024-01-15'
     * });
     */
    addRecord: record => cloud.callFunction('foodRecord', { 
      action: 'add', 
      data: record 
    }),
    
    /**
     * 获取指定日期的食物记录
     * @param {string} date - 日期字符串 (YYYY-MM-DD)
     * @returns {Promise<Object>} 食物记录列表
     * @example
     * const result = await api.food.getRecords('2024-01-15');
     * console.log(result.result.records);
     */
    getRecords: date => cloud.callFunction('foodRecord', { 
      action: 'getByDate', 
      data: { date } 
    }),
    
    /**
     * 获取历史食物记录
     * @param {string} startDate - 开始日期
     * @param {string} endDate - 结束日期
     * @returns {Promise<Object>} 历史记录
     * @example
     * const result = await api.food.getHistory('2024-01-01', '2024-01-31');
     */
    getHistory: (startDate, endDate) => cloud.callFunction('foodRecord', { 
      action: 'getHistory', 
      data: { startDate, endDate } 
    }),
    
    /**
     * 删除食物记录
     * @param {string} recordId - 记录ID
     * @returns {Promise<Object>} 删除结果
     * @example
     * await api.food.deleteRecord('record_123456');
     */
    deleteRecord: recordId => cloud.callFunction('foodRecord', { 
      action: 'delete', 
      data: { recordId } 
    }),
    
    /**
     * 更新食物记录
     * @param {string} recordId - 记录ID
     * @param {Object} data - 更新的数据
     * @returns {Promise<Object>} 更新结果
     * @example
     * await api.food.updateRecord('record_123456', { calories: 250 });
     */
    updateRecord: (recordId, data) => cloud.callFunction('foodRecord', { 
      action: 'update', 
      data: { recordId, ...data } 
    })
  },
  
  /**
   * 聊天相关API
   * @namespace
   */
  chat: {
    /**
     * 发送聊天消息
     * @param {string} message - 用户消息
     * @param {Array} context - 上下文消息数组
     * @returns {Promise<Object>} AI回复
     * @example
     * const result = await api.chat.send('今天吃什么好？', [
     *   { role: 'user', content: '我想减肥' },
     *   { role: 'assistant', content: '建议控制饮食...' }
     * ]);
     * console.log(result.result.reply);
     */
    send: (message, context) => cloud.callFunction('aiGateway', { 
      action: 'chat', 
      data: { message, context } 
    })
  }
}

/**
 * 导出API模块
 * @exports api
 */
module.exports = {
  /**
   * API错误类
   * @type {ApiError}
   */
  ApiError,
  /**
   * 云开发操作对象
   * @type {Object}
   */
  cloud,
  /**
   * 业务API接口
   * @type {Object}
   */
  api,
  /**
   * 安全API调用包装器
   * @type {Function}
   */
  safeApiCall
}
