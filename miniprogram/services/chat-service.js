/**
 * @fileoverview 聊天服务模块
 * @description 提供聊天消息的初始化、保存、加载、更新和查找等功能
 * @module services/chat-service
 */

const { STORAGE_KEYS } = require('../utils/constants')
const { createTextMessage, createQuickActionsMessage } = require('../utils/message-factory')
const { MESSAGE_ROLES } = require('../utils/constants')

/**
 * 欢迎消息内容
 * @constant {string}
 */
const WELCOME_MESSAGE = '您好！我是您的 AI 营养师 🧑‍⚕️\n\n我可以帮您：\n• 📷 拍照识别食物并计算营养\n• 📊 查看每日饮食报告\n• 💡 获取个性化饮食建议\n\n点击下方相机按钮开始记录今天的美餐吧！'

/**
 * 初始化聊天
 * @description 创建欢迎消息和快捷操作消息，返回初始消息列表
 * @returns {Array<Object>} 包含欢迎消息和快捷操作消息的消息数组
 * @returns {Object} returns[0] - 欢迎消息对象
 * @returns {Object} returns[1] - 快捷操作消息对象
 */
const initChat = () => {
  const welcomeMessage = createTextMessage(MESSAGE_ROLES.ASSISTANT, WELCOME_MESSAGE)
  const quickActions = createQuickActionsMessage()
  return [welcomeMessage, quickActions]
}

/**
 * 保存消息列表到本地存储
 * @description 将聊天消息列表持久化存储到微信小程序本地存储中
 * @param {Array<Object>} messages - 需要保存的消息列表
 * @returns {boolean} 保存成功返回 true，失败返回 false
 */
const saveMessages = messages => {
  try {
    if (messages?.length > 0) {
      wx.setStorageSync(STORAGE_KEYS.CHAT_MESSAGES, messages)
      return true
    }
  } catch (e) {
    console.error('保存聊天记录失败:', e)
  }
  return false
}

/**
 * 从本地存储加载消息列表
 * @description 从微信小程序本地存储中读取聊天消息列表
 * @returns {Array<Object>|null} 返回消息列表，如果没有记录或读取失败则返回 null
 */
const loadMessages = () => {
  try {
    const messages = wx.getStorageSync(STORAGE_KEYS.CHAT_MESSAGES)
    return messages?.length > 0 ? messages : null
  } catch (e) {
    console.error('读取聊天记录失败:', e)
    return null
  }
}

/**
 * 更新消息列表中的指定消息
 * @description 根据消息 ID 查找并更新消息数据，返回新的消息列表（不修改原数组）
 * @param {Array<Object>} messages - 消息列表
 * @param {string} msgId - 要更新的消息 ID
 * @param {Function} updater - 更新函数，接收消息数据对象，返回更新后的数据对象
 * @returns {Array<Object>} 更新后的新消息列表
 */
const updateMessageInList = (messages, msgId, updater) => {
  return messages.map(msg => {
    if (msg.id === msgId) {
      return { ...msg, data: { ...msg.data, ...updater(msg.data) } }
    }
    return msg
  })
}

/**
 * 查找指定类型的最后一条消息
 * @description 从消息列表末尾向前查找指定类型的消息
 * @param {Array<Object>} messages - 消息列表
 * @param {string} type - 消息类型
 * @returns {Object} 查找结果对象
 * @returns {number} returns.index - 消息在列表中的索引，未找到返回 -1
 * @returns {Object|null} returns.message - 找到的消息对象，未找到返回 null
 */
const findLastMessageByType = (messages, type) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === type) {
      return { index: i, message: messages[i] }
    }
  }
  return { index: -1, message: null }
}

/**
 * 折叠指定消息
 * @description 将指定 ID 的消息设置为折叠状态
 * @param {Array<Object>} messages - 消息列表
 * @param {string} msgId - 要折叠的消息 ID
 * @returns {Array<Object>} 更新后的新消息列表
 */
const collapseMessage = (messages, msgId) => {
  return updateMessageInList(messages, msgId, () => ({ collapsed: true }))
}

module.exports = {
  initChat,
  saveMessages,
  loadMessages,
  updateMessageInList,
  findLastMessageByType,
  collapseMessage
}