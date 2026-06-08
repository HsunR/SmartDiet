/**
 * profile-form.js — 用户信息内联表单
 *
 * 职责：
 * - onUserInfoFormSubmit  提交用户档案到 FastAPI
 * - onFormFieldInput      文本框实时输入
 * - onFormFieldPicker     单项选择器确认
 * - onMultiPickerToggle   多选项切换
 */

const { createTextMessage } = require('../../../utils/message-factory')
const { MESSAGE_TYPES, MESSAGE_ROLES } = require('../../../utils/constants')
const { api, safeApiCall } = require('../../../utils/api')
const chatService = require('../../../services/chat-service')

module.exports = {

  /** 提交用户档案 → 成功后标记表单为已完成 */
  async onUserInfoFormSubmit(e) {
    const { formData } = e.detail
    this.setData({ isLoading: true })
    try {
      const result = await safeApiCall(() => api.user.updateProfile(formData))
      if (result.success) {
        const successMessage = createTextMessage(
          MESSAGE_ROLES.ASSISTANT,
          `✅ 个人信息已保存！\n\n根据您的信息，我已为您计算了每日营养目标。开始记录您的第一餐吧！`
        )
        const formIndex = this.data.messages.findIndex(m => m.type === MESSAGE_TYPES.USER_INFO_FORM)
        if (formIndex !== -1) {
          this.setData({ ['messages[' + formIndex + '].data.completed']: true })
        }
        this.setData({ messages: [...this.data.messages, successMessage], userProfile: formData })
        chatService.saveMessages(this.data.messages)
      } else {
        this.showErrorMessage('保存失败，请重试')
      }
    } catch (error) {
      console.error('Save user info error:', error)
      this.showErrorMessage('保存失败')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /** 表单文本字段实时输入 */
  onFormFieldInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ ['formValues.' + field]: e.detail.value })
  },

  /** 单项选择器确认 → 根据索引取选项值 */
  onFormFieldPicker(e) {
    const { field } = e.currentTarget.dataset
    const index = e.detail.value
    const fieldDef = this.data.messages
      .find(m => m.type === MESSAGE_TYPES.USER_INFO_FORM)
      ?.data?.fields?.find(f => f.key === field)
    if (fieldDef) {
      this.setData({ ['formValues.' + field]: fieldDef.options[index] })
    }
  },

  /** 多选项切换（存在则移除，否则添加） */
  onMultiPickerToggle(e) {
    const { field, value } = e.currentTarget.dataset
    const currentValues = this.data.formValues[field] || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    this.setData({ ['formValues.' + field]: newValues })
  }
}
