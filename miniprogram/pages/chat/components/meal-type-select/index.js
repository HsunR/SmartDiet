/**
 * @fileoverview 餐次选择组件（按钮模式）
 * 使用按钮列表方式让用户选择餐次类型，支持折叠/展开状态
 * @component MealTypeSelect
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
     * 餐次选项列表
     * @type {Array<{label: string, value: string}>}
     */
    mealTypes: {
      type: Array,
      value: []
    },
    /**
     * 当前选中的餐次值
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
     * 当前选中的餐次索引
     * @type {number}
     */
    selectedMealTypeIndex: 0,
    /**
     * 当前选中的餐次标签
     * @type {string}
     */
    selectedMealLabel: ''
  },

  /**
   * 数据监听器
   */
  observers: {
    /**
     * 监听餐次列表和选中值的变化
     * @param {Array} mealTypes - 餐次选项列表
     * @param {string} selectedMealType - 当前选中的餐次值
     */
    'mealTypes, selectedMealType': function(mealTypes, selectedMealType) {
      if (mealTypes && mealTypes.length > 0) {
        const index = mealTypes.findIndex(item => item.value === selectedMealType);
        const label = index >= 0 && mealTypes[index] ? mealTypes[index].label : '';
        this.setData({
          selectedMealTypeIndex: index >= 0 ? index : 0,
          selectedMealLabel: label
        });
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 选择餐次事件
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前目标元素
     * @param {Object} e.currentTarget.dataset - 数据集
     * @param {string} e.currentTarget.dataset.value - 选中的餐次值
     * @fires MealTypeSelect#select
     */
    onSelect(e) {
      const value = e.currentTarget.dataset.value;
      this.triggerEvent('select', { value, msgId: this.data.msgId });
    }
  }
})
