/**
 * @fileoverview 用户信息表单处理模块
 * @description 处理用户信息表单的提交、字段输入、选择器交互等功能
 * @module handlers/form-handler
 */

const { createTextMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES, MESSAGE_ROLES } = require('../../../utils/constants')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {
  /**
   * 处理用户信息表单提交
   * @async
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 事件详情
   * @param {Object} e.detail.formData - 表单数据对象
   * @returns {Promise<void>}
   * @description 提交用户个人信息到服务器，成功后更新UI状态并显示确认消息
   */
  async onUserInfoFormSubmit(e) {
    const { formData } = e.detail
    this.setData({ isLoading: true })

    try {
      // 调用API保存用户资料
      const result = await safeApiCall(() => api.user.updateProfile(formData))

      if (result.success) {
        // 创建成功提示消息
        const successMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `✅ 个人信息已保存！\n\n根据您的信息，我已为您计算了每日营养目标。开始记录您的第一餐吧！`
        )

        // 标记表单消息为已完成
        const userInfoFormIndex = this.data.messages.findIndex(m => m.type === MESSAGE_TYPES.USER_INFO_FORM)
        if (userInfoFormIndex !== -1) {
          this.setData({ ['messages[' + userInfoFormIndex + '].data.completed']: true })
        }

        // 更新页面数据和消息列表
        this.setData({
          messages: [...this.data.messages, successMessage],
          userProfile: formData
        })
        chatService.saveMessages(this.data.messages)
      } else {
        this.showErrorMessage('保存失败，请重试')
      }
    } catch (error) {
      console.error('Save user info error:', error)
      this.showErrorMessage('保存失败')
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  /**
   * 处理表单字段输入事件
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget - 当前目标元素
   * @param {Object} e.currentTarget.dataset - 元素数据集
   * @param {string} e.currentTarget.dataset.field - 字段名称
   * @param {Object} e.detail - 事件详情
   * @param {*} e.detail.value - 输入值
   * @returns {void}
   * @description 实时更新表单字段值到页面数据中
   */
  onFormFieldInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ ['formValues.' + field]: e.detail.value })
  },

  /**
   * 处理表单选择器选择事件
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget - 当前目标元素
   * @param {Object} e.currentTarget.dataset - 元素数据集
   * @param {string} e.currentTarget.dataset.field - 字段名称
   * @param {Object} e.detail - 事件详情
   * @param {number} e.detail.value - 选中项的索引
   * @returns {void}
   * @description 处理picker组件的选择事件，根据索引获取选项值并更新表单数据
   */
  onFormFieldPicker(e) {
    const { field } = e.currentTarget.dataset
    const index = e.detail.value
    // 从表单消息中获取字段定义，查找对应选项
    const fieldDef = this.data.messages.find(m => m.type === MESSAGE_TYPES.USER_INFO_FORM)?.data?.fields?.find(f => f.key === field)
    if (fieldDef) {
      this.setData({ ['formValues.' + field]: fieldDef.options[index] })
    }
  },

  /**
   * 处理多选项切换事件
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget - 当前目标元素
   * @param {Object} e.currentTarget.dataset - 元素数据集
   * @param {string} e.currentTarget.dataset.field - 字段名称
   * @param {string} e.currentTarget.dataset.value - 选项值
   * @returns {void}
   * @description 切换多选字段的选中状态，添加或移除选项值
   */
  onMultiPickerToggle(e) {
    const { field, value } = e.currentTarget.dataset
    // 获取当前已选值数组
    const currentValues = this.data.formValues[field] || []
    // 切换选中状态：已存在则移除，否则添加
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    this.setData({ ['formValues.' + field]: newValues })
  }
}
