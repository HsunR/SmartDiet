/**
 * @fileoverview 日期选择组件
 * 用于让用户选择日期，支持日期选择器和相关操作确认
 * @component DateSelect
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
     * @default '选择日期'
     */
    content: {
      type: String,
      value: '选择日期'
    },
    /**
     * 当前选中的日期（YYYY-MM-DD 格式）
     * @type {string}
     */
    selectedDate: {
      type: String,
      value: ''
    },
    /**
     * 当前选中的餐次类型
     * @type {string}
     */
    selectedMealType: {
      type: String,
      value: ''
    },
    /**
     * 是否折叠状态
     * @type {boolean}
     * @default false
     */
    collapsed: {
      type: Boolean,
      value: false
    },
    /**
     * 消息 ID，用于标识当前消息
     * @type {string}
     */
    msgId: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件内部数据
   */
  data: {
    /**
     * 当前日期值
     * @type {string}
     */
    currentDate: ''
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    /**
     * 组件被附加到页面时触发
     * 初始化当前日期为传入的选中日期
     */
    attached() {
      this.setData({
        currentDate: this.data.selectedDate
      });
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 日期改变事件
     * @param {Object} e - 事件对象
     * @param {Object} e.detail - 事件详情
     * @param {string} e.detail.value - 选中的日期值（YYYY-MM-DD 格式）
     * @fires DateSelect#dateChange
     */
    onDateChange(e) {
      const selectedDate = e.detail.value;
      this.setData({
        currentDate: selectedDate
      });
      this.triggerEvent('dateChange', {
        value: selectedDate,
        msgId: this.data.msgId
      });
    },

    /**
     * 确认选择事件
     * 触发 confirm 事件向父组件传递选中的日期和餐次信息
     * @fires DateSelect#confirm
     */
    onConfirm() {
      this.triggerEvent('confirm', {
        date: this.data.currentDate,
        mealType: this.data.selectedMealType,
        msgId: this.data.msgId
      });
    }
  }
});
