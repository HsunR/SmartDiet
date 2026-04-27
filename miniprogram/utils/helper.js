/**
 * @fileoverview 通用辅助函数模块
 * @description 提供ID生成、防抖节流、图片处理、云存储操作、餐次判断等核心工具函数
 * @module utils/helper
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const helper = require('./helper');
 * 
 * // 生成唯一ID
 * const id = helper.generateId();
 * 
 * // 防抖处理搜索输入
 * const debouncedSearch = helper.debounce((keyword) => {
 *   console.log('搜索:', keyword);
 * }, 500);
 * 
 * // 获取当前餐次
 * const mealType = helper.getCurrentMealType();
 */

const { formatDate } = require('./formatter')

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符，格式为 id_<时间戳>_<随机字符串>
 * @example
 * const id = helper.generateId();
 * console.log(id); // "id_1705312345678_a1b2c3d4e"
 * 
 * // 用于创建新记录
 * const newRecord = {
 *   id: helper.generateId(),
 *   name: '新记录',
 *   createdAt: Date.now()
 * };
 */
const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 防抖函数 - 延迟执行，在指定时间内多次调用只执行最后一次
 * @param {Function} func - 要防抖的函数
 * @param {number} [wait=300] - 延迟时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 * @example
 * // 搜索输入防抖
 * const searchInput = helper.debounce((value) => {
 *   console.log('执行搜索:', value);
 *   // 调用搜索API
 * }, 500);
 * 
 * // 绑定到输入事件
 * input.addEventListener('input', (e) => searchInput(e.target.value));
 * 
 * // 保存按钮防抖
 * const saveData = helper.debounce(() => {
 *   console.log('保存数据');
 * }, 1000);
 */
const debounce = (func, wait = 300) => {
  let timeout
  return function(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * 节流函数 - 限制函数在指定时间内只执行一次
 * @param {Function} func - 要节流的函数
 * @param {number} [limit=300] - 时间限制（毫秒）
 * @returns {Function} 节流处理后的函数
 * @example
 * // 滚动事件节流
 * const handleScroll = helper.throttle(() => {
 *   console.log('处理滚动');
 * }, 200);
 * 
 * window.addEventListener('scroll', handleScroll);
 * 
 * // 按钮点击节流
 * const submitForm = helper.throttle(() => {
 *   console.log('提交表单');
 * }, 3000);
 */
const throttle = (func, limit = 300) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 压缩图片
 * @param {string} tempFilePath - 临时文件路径
 * @param {number} [quality=80] - 压缩质量，范围1-100
 * @returns {Promise<string>} 压缩后的临时文件路径
 * @example
 * // 压缩用户选择的图片
 * const compressedPath = await helper.compressImage(res.tempFilePaths[0], 80);
 * console.log('压缩后路径:', compressedPath);
 * 
 * // 低质量压缩（适合缩略图）
 * const thumbnailPath = await helper.compressImage(imagePath, 30);
 * 
 * // 高质量压缩
 * const highQualityPath = await helper.compressImage(imagePath, 90);
 */
const compressImage = (tempFilePath, quality = 80) => {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: tempFilePath,
      quality,
      success: res => resolve(res.tempFilePath),
      fail: err => reject(err)
    })
  })
}

/**
 * 上传文件到云存储
 * @param {string} cloudPath - 云存储路径（如 'images/2024/photo.jpg'）
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<string>} 云文件ID
 * @example
 * // 上传用户头像
 * const fileID = await helper.uploadFile(
 *   `avatars/${userId}.jpg`,
 *   tempFilePath
 * );
 * 
 * // 上传食物图片
 * const foodImageID = await helper.uploadFile(
 *   `foods/${helper.generateId()}.jpg`,
 *   imagePath
 * );
 */
const uploadFile = (cloudPath, filePath) => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => resolve(res.fileID),
      fail: err => reject(err)
    })
  })
}

/**
 * 获取云文件临时下载链接
 * @param {string} fileID - 云文件ID
 * @returns {Promise<string>} 临时下载链接
 * @example
 * // 获取图片临时链接用于显示
 * const imageUrl = await helper.getTempFileURL('cloud://env/path/file.jpg');
 * this.setData({ imageUrl });
 * 
 * // 批量获取链接
 * const urls = await Promise.all(
 *   fileIDs.map(id => helper.getTempFileURL(id))
 * );
 */
const getTempFileURL = fileID => {
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

/**
 * 上传文件并获取临时链接（组合操作）
 * @param {string} cloudPath - 云存储路径
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<{fileID: string, tempUrl: string}>} 包含fileID和临时链接的对象
 * @example
 * // 上传并获取链接
 * const { fileID, tempUrl } = await helper.uploadAndGetUrl(
 *   'images/photo.jpg',
 *   tempFilePath
 * );
 * console.log('文件ID:', fileID);
 * console.log('临时链接:', tempUrl);
 * 
 * // 用于图片预览
 * const result = await helper.uploadAndGetUrl(path, file);
 * previewImage(result.tempUrl);
 */
const uploadAndGetUrl = async (cloudPath, filePath) => {
  const fileID = await uploadFile(cloudPath, filePath)
  const tempUrl = await getTempFileURL(fileID)
  return { fileID, tempUrl }
}

/**
 * 根据当前时间获取对应的餐次类型
 * @returns {string} 餐次类型 ('breakfast' | 'lunch' | 'dinner' | 'snack')
 * @example
 * // 根据时间自动判断餐次
 * const mealType = helper.getCurrentMealType();
 * console.log(mealType); // 'breakfast' (6:00-9:59)
 * 
 * // 用于记录用餐
 * const record = {
 *   mealType: helper.getCurrentMealType(),
 *   foods: [...],
 *   timestamp: Date.now()
 * };
 * 
 * // 时间段对应关系：
 * // 6:00-9:59  -> breakfast (早餐)
 * // 11:00-13:59 -> lunch (午餐)
 * // 17:00-19:59 -> dinner (晚餐)
 * // 其他时间 -> snack (其他)
 */
const getCurrentMealType = () => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 17 && hour < 20) return 'dinner'
  return 'snack'
}

/**
 * 获取餐次类型的中文标签
 * @param {string} type - 餐次类型
 * @returns {string} 中文标签
 * @example
 * // 获取当前餐次的中文标签
 * const type = helper.getCurrentMealType();
 * const label = helper.getMealTypeLabel(type);
 * console.log(label); // '早餐'
 * 
 * // 显示所有餐次选项
 * const types = ['breakfast', 'lunch', 'dinner', 'snack'];
 * const options = types.map(t => ({
 *   value: t,
 *   label: helper.getMealTypeLabel(t)
 * }));
 * 
 * // 未知类型返回'其他'
 * const label = helper.getMealTypeLabel('unknown'); // '其他'
 */
const getMealTypeLabel = type => {
  const labels = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '其他'
  }
  return labels[type] || '其他'
}

/**
 * 导出辅助函数模块
 * @exports helper
 */
module.exports = {
  /**
   * 生成唯一ID
   * @type {Function}
   */
  generateId,
  /**
   * 格式化日期（从formatter模块重新导出）
   * @type {Function}
   */
  formatDate,
  /**
   * 防抖函数
   * @type {Function}
   */
  debounce,
  /**
   * 节流函数
   * @type {Function}
   */
  throttle,
  /**
   * 压缩图片
   * @type {Function}
   */
  compressImage,
  /**
   * 上传文件到云存储
   * @type {Function}
   */
  uploadFile,
  /**
   * 获取云文件临时链接
   * @type {Function}
   */
  getTempFileURL,
  /**
   * 上传并获取临时链接
   * @type {Function}
   */
  uploadAndGetUrl,
  /**
   * 获取当前餐次类型
   * @type {Function}
   */
  getCurrentMealType,
  /**
   * 获取餐次中文标签
   * @type {Function}
   */
  getMealTypeLabel
}
