/**
 * @fileoverview 用户信息表单组件
 * 用于收集用户个人信息，支持多种表单字段类型（输入框、选择器、多选项等）
 * @component UserInfoForm
 * @version 1.0.0
 */

Component({
  /**
   * 组件属性（外部传入的数据）
   */
  properties: {
    /**
     * 表单标题/提示文本
     * @type {string}
     */
    content: {
      type: String,
      value: ''
    },
    /**
     * 表单字段配置列表
     * @type {Array<{key: string, label: string, type: string, options?: Array}>}
     */
    fields: {
      type: Array,
      value: []
    },
    /**
     * 表单字段值对象
     * @type {Object}
     */
    values: {
      type: Object,
      value: {}
    }
  },

  /**
   * 组件内部数据
   */
  data: {
    /**
     * 表单数据对象
     * @type {Object}
     */
    formData: {},
    /**
     * 选择器显示值映射
     * @type {Object}
     */
    pickerDisplayValues: {},
    /**
     * 选择器选中索引映射
     * @type {Object}
     */
    pickerIndexes: {},
    /**
     * 选择器显示文本映射
     * @type {Object}
     */
    pickerDisplayTexts: {}
  },

  /**
   * 数据监听器
   */
  observers: {
    /**
     * 监听表单值和字段配置的变化
     * @param {Object} values - 表单字段值
     * @param {Array} fields - 表单字段配置
     */
    'values, fields': function(values, fields) {
      if (values) {
        this.setData({ formData: values });
      }
      this.updatePickerData();
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 更新选择器数据
     * 根据字段配置初始化选择器的显示值和选中索引
     */
    updatePickerData() {
      const pickerDisplayValues = {};
      const pickerIndexes = {};
      const pickerDisplayTexts = {};

      this.data.fields.forEach(field => {
        if (field.type === 'picker' && field.options) {
          const displayValues = field.options.map(opt => opt.label);
          pickerDisplayValues[field.key] = displayValues;

          const currentValue = this.data.formData[field.key];
          const selectedIndex = field.options.findIndex(opt => opt.value === currentValue);
          pickerIndexes[field.key] = selectedIndex >= 0 ? selectedIndex : 0;
          pickerDisplayTexts[field.key] = selectedIndex >= 0 ? field.options[selectedIndex].label : '';
        }
      });

      this.setData({
        pickerDisplayValues,
        pickerIndexes,
        pickerDisplayTexts
      });
    },

    /**
     * 输入框值改变事件
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前目标元素
     * @param {Object} e.currentTarget.dataset - 数据集
     * @param {string} e.currentTarget.dataset.key - 字段键名
     * @param {Object} e.detail - 事件详情
     * @param {string} e.detail.value - 输入的值
     */
    onInputChange(e) {
      const key = e.currentTarget.dataset.key;
      const value = e.detail.value;
      const formData = { ...this.data.formData };
      formData[key] = value;
      this.setData({ formData });
    },

    /**
     * 选择器值改变事件
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前目标元素
     * @param {Object} e.currentTarget.dataset - 数据集
     * @param {string} e.currentTarget.dataset.key - 字段键名
     * @param {Object} e.detail - 事件详情
     * @param {number} e.detail.value - 选中的索引
     */
    onPickerChange(e) {
      const key = e.currentTarget.dataset.key;
      const field = this.data.fields.find(f => f.key === key);
      const selectedIndex = e.detail.value;

      if (field && field.options && field.options[selectedIndex]) {
        const formData = { ...this.data.formData };
        formData[key] = field.options[selectedIndex].value;
        this.setData({ formData });

        const pickerDisplayTexts = { ...this.data.pickerDisplayTexts };
        pickerDisplayTexts[key] = field.options[selectedIndex].label;
        this.setData({ pickerDisplayTexts });
      }
    },

    /**
     * 多选项点击事件
     * @param {Object} e - 事件对象
     * @param {Object} e.currentTarget - 当前目标元素
     * @param {Object} e.currentTarget.dataset - 数据集
     * @param {string} e.currentTarget.dataset.key - 字段键名
     * @param {string} e.currentTarget.dataset.value - 选项值
     */
    onMultiOptionTap(e) {
      const key = e.currentTarget.dataset.key;
      const value = e.currentTarget.dataset.value;
      const formData = { ...this.data.formData };
      const currentValues = formData[key] || [];

      const index = currentValues.indexOf(value);
      if (index > -1) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(value);
      }

      formData[key] = currentValues;
      this.setData({ formData });
    },

    /**
     * 表单提交事件
     * 触发 submit 事件向父组件传递表单数据
     * @fires UserInfoForm#submit
     */
    onSubmit() {
      this.triggerEvent('submit', {
        formData: this.data.formData
      });
    }
  }
})
