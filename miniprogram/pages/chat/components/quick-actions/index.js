/**
 * @fileoverview 快捷操作组件
 * 用于显示快捷操作按钮列表，支持点击触发相应操作
 * @component QuickActions
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
     * 操作按钮列表
     * @type {Array<{id: string, label: string, icon?: string}>}
     */
    actions: {
      type: Array,
      value: []
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 操作按钮点击事件
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前目标元素
     * @param {Object} e.currentTarget.dataset - 数据集
     * @param {string} e.currentTarget.dataset.id - 操作按钮 ID
     * @fires QuickActions#actionClick
     */
    onActionTap(e) {
      const actionId = e.currentTarget.dataset.id;
      this.triggerEvent('actionClick', {
        actionId
      });
    }
  }
})
