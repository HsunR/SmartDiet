/**
 * @fileoverview 本地存储封装模块
 * @description 提供微信小程序本地存储的同步API封装，包含错误处理和默认值支持
 * @module utils/storage
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const storage = require('./storage');
 * 
 * // 存储数据
 * storage.set('userInfo', { name: '张三', age: 25 });
 * 
 * // 获取数据
 * const userInfo = storage.get('userInfo');
 * 
 * // 获取带默认值的数据
 * const settings = storage.get('settings', { theme: 'light' });
 * 
 * // 删除数据
 * storage.remove('userInfo');
 * 
 * // 清空所有存储
 * storage.clear();
 */

/**
 * 设置存储数据
 * @param {string} key - 存储键名
 * @param {*} value - 要存储的值（任意类型）
 * @returns {boolean} 存储是否成功
 * @example
 * // 存储字符串
 * storage.set('username', '张三');
 * 
 * // 存储对象
 * storage.set('userInfo', { name: '张三', age: 25 });
 * 
 * // 存储数组
 * storage.set('history', ['item1', 'item2']);
 * 
 * // 检查存储结果
 * const success = storage.set('key', 'value');
 * if (!success) {
 *   console.error('存储失败');
 * }
 */
const set = (key, value) => {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    console.error(`Storage set failed for key "${key}":`, e)
    return false
  }
}

/**
 * 获取存储数据
 * @param {string} key - 存储键名
 * @param {*} [defaultValue=null] - 当键不存在或获取失败时返回的默认值
 * @returns {*} 存储的值或默认值
 * @example
 * // 获取已存储的数据
 * const username = storage.get('username');
 * 
 * // 获取带默认值的数据
 * const settings = storage.get('settings', { theme: 'light', fontSize: 14 });
 * 
 * // 获取数组数据
 * const history = storage.get('history', []);
 * history.forEach(item => console.log(item));
 */
const get = (key, defaultValue = null) => {
  try {
    const value = wx.getStorageSync(key)
    return value !== '' ? value : defaultValue
  } catch (e) {
    console.error(`Storage get failed for key "${key}":`, e)
    return defaultValue
  }
}

/**
 * 删除存储数据
 * @param {string} key - 要删除的存储键名
 * @returns {boolean} 删除是否成功
 * @example
 * // 删除单个键
 * storage.remove('username');
 * 
 * // 删除用户相关信息
 * storage.remove('userInfo');
 * storage.remove('token');
 * 
 * // 检查删除结果
 * const success = storage.remove('key');
 * if (!success) {
 *   console.error('删除失败');
 * }
 */
const remove = key => {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (e) {
    console.error(`Storage remove failed for key "${key}":`, e)
    return false
  }
}

/**
 * 清空所有本地存储数据
 * @returns {boolean} 清空是否成功
 * @warning 此操作会删除所有本地存储的数据，请谨慎使用
 * @example
 * // 用户退出登录时清空数据
 * function logout() {
 *   storage.clear();
 *   wx.redirectTo({ url: '/pages/login/login' });
 * }
 * 
 * // 检查清空结果
 * const success = storage.clear();
 * if (success) {
 *   console.log('所有存储已清空');
 * }
 */
const clear = () => {
  try {
    wx.clearStorageSync()
    return true
  } catch (e) {
    console.error('Storage clear failed:', e)
    return false
  }
}

/**
 * 导出存储模块
 * @exports storage
 */
module.exports = {
  /**
   * 设置存储数据
   * @type {Function}
   */
  set,
  /**
   * 获取存储数据
   * @type {Function}
   */
  get,
  /**
   * 删除存储数据
   * @type {Function}
   */
  remove,
  /**
   * 清空所有存储
   * @type {Function}
   */
  clear
}
