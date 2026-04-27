/**
 * @fileoverview 评分选择组件
 * 用于让用户对餐食进行评分，支持星级或选项评分
 * @component RatingSelect
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
     * 评分选项列表
     * @type {Array<{label: string, value: number}>}
     */
    ratings: {
      type: Array,
      value: []
    },
    /**
     * 当前选中的评分值
     * @type {number}
     * @default 0
     */
    selectedRating: {
      type: Number,
      value: 0
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
  data: {},

  /**
   * 组件方法
   */
  methods: {
    /**
     * 选择评分事件
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前目标元素
     * @param {Object} e.currentTarget.dataset - 数据集
     * @param {number} e.currentTarget.dataset.value - 选中的评分值
     * @fires RatingSelect#select
     */
    handleSelect(e) {
      const value = e.currentTarget.dataset.value;
      this.triggerEvent('select', { value, msgId: this.data.msgId });
    }
  }
});
