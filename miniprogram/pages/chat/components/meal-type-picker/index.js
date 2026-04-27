/**
 * @fileoverview 餐次选择器组件（Picker 模式）
 * 使用滚动选择器方式让用户选择餐次类型（早餐、午餐、晚餐等）
 * @component MealTypePicker
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性（外部传入的数据）
   */
  properties: {
    /**
     * 选择器标题/提示文本
     * @type {string}
     * @default '选择餐次'
     */
    content: {
      type: String,
      value: '选择餐次'
    },
    /**
     * 餐次选项列表
     * @type {Array<{label: string, value: string}>}
     */
    mealTypes: {
      type: Array,
      value: []
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
     * 当前选中的索引
     * @type {number}
     */
    pickerIndex: 0
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 选择器值改变事件
     * @param {Object} e - 事件对象
     * @param {Object} e.detail - 事件详情
     * @param {number} e.detail.value - 选中的索引值
     */
    onPickerChange(e) {
      this.setData({
        pickerIndex: e.detail.value[0]
      });
    },

    /**
     * 确认选择事件
     * 触发 confirm 事件向父组件传递选中的餐次信息
     * @fires MealTypePicker#confirm
     */
    onConfirm() {
      const { mealTypes, pickerIndex } = this.data;
      const selectedValue = mealTypes[pickerIndex]?.value;

      this.triggerEvent('confirm', {
        value: selectedValue,
        index: pickerIndex,
        item: mealTypes[pickerIndex],
        msgId: this.data.msgId
      });
    }
  }
});
