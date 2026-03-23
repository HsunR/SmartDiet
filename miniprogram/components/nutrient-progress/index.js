Component({
  properties: {
    current: {
      type: Number,
      value: 0
    },
    target: {
      type: Number,
      value: 100
    },
    label: {
      type: String,
      value: ''
    },
    unit: {
      type: String,
      value: ''
    },
    showValue: {
      type: Boolean,
      value: true
    },
    size: {
      type: String,
      value: 'normal'
    },
    color: {
      type: String,
      value: 'primary'
    }
  },

  data: {
    percent: 0,
    status: 'normal'
  },

  observers: {
    'current, target': function(current, target) {
      const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 150) : 0
      let status = 'normal'
      
      if (percent < 50) {
        status = 'warning'
      } else if (percent <= 100) {
        status = 'success'
      } else if (percent <= 110) {
        status = 'warning'
      } else {
        status = 'error'
      }
      
      this.setData({ percent, status })
    }
  },

  methods: {
    getProgressColor: function(status, color) {
      if (color !== 'primary') {
        return color
      }
      
      const colors = {
        normal: '#4CAF50',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336'
      }
      return colors[status] || '#4CAF50'
    }
  }
})
