/**
 * handlers/index.js — 处理器入口
 *
 * 将各业务模块按职责拆分，统一归集后由 index.js 通过 ...handlers 混入 Page。
 * 每个模块导出一个对象，键名为事件处理方法名，值为此处 this 可调用的函数。
 */

const sendMessage = require('./send-message')
const imageRecognition = require('./image-recognition')
const saveRecord = require('./save-record')
const profileForm = require('./profile-form')
const selection = require('./selection')

module.exports = {
  ...sendMessage,
  ...imageRecognition,
  ...saveRecord,
  ...profileForm,
  ...selection
}
