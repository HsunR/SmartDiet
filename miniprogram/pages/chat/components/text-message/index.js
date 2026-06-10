var mdToHtml = require('../../../utils/markdown').mdToHtml

Component({
  properties: {
    content: {
      type: String,
      value: ''
    },
    role: {
      type: String,
      value: 'assistant'
    },
    timestamp: {
      type: Number,
      value: 0
    },
    isStreaming: {
      type: Boolean,
      value: false
    }
  },

  observers: {
    'content': function (content) {
      if (content) {
        this.setData({
          htmlContent: mdToHtml(content)
        })
      } else {
        this.setData({
          htmlContent: ''
        })
      }
    }
  },

  data: {
    htmlContent: ''
  }
})
