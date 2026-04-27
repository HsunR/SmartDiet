/**
 * @fileoverview 图片服务模块
 * @description 提供图片选择、压缩、上传、预览等功能的服务层封装
 * @module services/image-service
 * @author SmartDiet Team
 * @version 1.0.0
 * @example
 * // 使用示例
 * const imageService = require('./image-service');
 *
 * // 选择图片来源
 * const sourceType = await imageService.chooseImage();
 *
 * // 处理图片（压缩并上传）
 * const { fileID, tempUrl } = await imageService.processImage(tempFilePath);
 *
 * // 预览图片
 * imageService.previewImage(imageUrl);
 */

const { compressImage, uploadAndGetUrl, generateId } = require('../utils/helper')

/**
 * 选择图片来源
 * @async
 * @returns {Promise<Array<string>>} 图片来源类型数组 ['camera'] 或 ['album']
 * @description 显示操作菜单让用户选择拍照或从相册选择
 * @example
 * try {
 *   const sourceType = await imageService.chooseImage();
 *   // sourceType: ['camera'] 或 ['album']
 * } catch (error) {
 *   // 用户取消选择
 * }
 */
const chooseImage = () => {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: res => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        resolve(sourceType)
      },
      fail: reject
    })
  })
}

/**
 * 从指定来源选择图片
 * @async
 * @param {Array<string>} sourceType - 图片来源类型 ['camera'] 或 ['album']
 * @returns {Promise<string>} 图片临时文件路径
 * @description 调用微信API从相机或相册选择图片
 * @example
 * const tempFilePath = await imageService.pickImage(['camera']);
 * // 或
 * const tempFilePath = await imageService.pickImage(['album']);
 */
const pickImage = async sourceType => {
  const chooseResult = await wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType,
    sizeType: ['compressed']
  })
  return chooseResult.tempFiles[0].tempFilePath
}

/**
 * 处理图片（压缩并上传）
 * @async
 * @param {string} tempFilePath - 图片临时文件路径
 * @returns {Promise<Object>} 处理结果
 * @returns {string} returns.fileID - 云存储文件ID
 * @returns {string} returns.tempUrl - 临时访问URL
 * @description 压缩图片后上传到云存储，并返回文件ID和临时URL
 * @example
 * const { fileID, tempUrl } = await imageService.processImage(tempFilePath);
 * console.log('文件ID:', fileID);
 * console.log('临时URL:', tempUrl);
 */
const processImage = async tempFilePath => {
  // 压缩图片，质量80%
  const compressedPath = await compressImage(tempFilePath, 80)
  // 生成云存储路径
  const cloudPath = `food_images/${generateId()}.jpg`
  // 上传并获取临时URL
  return await uploadAndGetUrl(cloudPath, compressedPath)
}

/**
 * 预览图片
 * @param {string} url - 图片URL
 * @returns {void}
 * @description 调用微信API预览单张图片
 * @example
 * imageService.previewImage('https://example.com/food.jpg');
 */
const previewImage = url => {
  wx.previewImage({ urls: [url], current: url })
}

/**
 * 导出图片服务模块
 * @exports imageService
 */
module.exports = {
  /**
   * 选择图片来源
   * @type {Function}
   */
  chooseImage,
  /**
   * 从指定来源选择图片
   * @type {Function}
   */
  pickImage,
  /**
   * 处理图片（压缩并上传）
   * @type {Function}
   */
  processImage,
  /**
   * 预览图片
   * @type {Function}
   */
  previewImage
}
