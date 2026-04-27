/**
 * @fileoverview 反馈输入组件
 * 用于收集用户反馈或文本输入，支持输入和提交操作
 * @component FeedbackInput
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性（外部传入的数据）
   */
  properties: {
    /**
     * 组件标题/提示文本
     * @type {string}
     */
    content: {
      type: String,
      value: ''
    },
    /**
     * 输入框占位符文本
     * @type {string}
     * @default '请输入内容'
     */
    placeholder: {
      type: String,
      value: '请输入内容'
    },
    /**
     * 输入框的初始值
     * @type {string}
     */
    value: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件内部数据
   */
  data: {
    /**
     * 当前输入的值
     * @type {string}
     */
    inputValue: ''
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 输入事件处理
     * @param {Object} e - 事件对象
     * @param {Object} e.detail - 事件详情
     * @param {string} e.detail.value - 输入的值
     * @fires FeedbackInput#input
     */
    onInput(e) {
      const { value } = e.detail;
      this.setData({
        inputValue: value
      });
      this.triggerEvent('input', {
        value
      });
    },

    /**
     * 提交事件处理
     * 触发 submit 事件向父组件传递输入的反馈内容
     * @fires FeedbackInput#submit
     */
    onSubmit() {
      this.triggerEvent('submit', {
        feedback: this.data.inputValue
      });
    }
  }
})
