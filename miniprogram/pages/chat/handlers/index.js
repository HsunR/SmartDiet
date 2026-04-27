/**
 * @fileoverview 聊天页面处理器入口模块
 * @description 集中导出所有聊天页面的事件处理器，包括聊天、图片、记录、表单、反馈和交互处理
 * @module handlers/index
 * @author SmartDiet Team
 * @created 2026-04-26
 */

const chatHandler = require('./chat-handler')
const imageHandler = require('./image-handler')
const recordHandler = require('./record-handler')
const formHandler = require('./form-handler')
const feedbackHandler = require('./feedback-handler')
const interactionHandler = require('./interaction-handler')

/**
 * 合并所有处理器模块并导出
 * @exports {Object} 包含所有聊天页面处理函数的对象
 */
module.exports = {
  ...chatHandler,
  ...imageHandler,
  ...recordHandler,
  ...formHandler,
  ...feedbackHandler,
  ...interactionHandler
}
