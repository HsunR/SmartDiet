var processInline = function (text) {
  var result = text
  result = result.replace(/`(.+?)`/g, '<code style="font-size:24rpx;background:#F5F5F5;padding:2rpx 8rpx;border-radius:4rpx;">$1</code>')
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>')
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  result = result.replace(/_(.+?)_/g, '<em>$1</em>')
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>')
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="text-decoration:none;">$1</a>')
  return result
}

var mdToHtml = function (text) {
  if (!text) return ''

  var html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  var lines = html.split('\n')
  var result = []
  var inList = false
  var listType = ''

  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim()

    if (/^[-*_]{3,}\s*$/.test(trimmed)) {
      if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false }
      result.push('<hr style="border:none;border-top:2rpx solid #E0E0E0;margin:16rpx 0;" />')
      continue
    }

    if (/^[-*+]\s/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push('</ol>')
        result.push('<ul style="margin:0;padding-left:32rpx;">')
        inList = true
        listType = 'ul'
      }
      result.push('<li style="font-size:28rpx;line-height:1.6;margin:4rpx 0;">' + processInline(trimmed.replace(/^[-*+]\s+/, '')) + '</li>')
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push('</ul>')
        result.push('<ol style="margin:0;padding-left:32rpx;">')
        inList = true
        listType = 'ol'
      }
      result.push('<li style="font-size:28rpx;line-height:1.6;margin:4rpx 0;">' + processInline(trimmed.replace(/^\d+\.\s+/, '')) + '</li>')
      continue
    }

    if (inList) {
      result.push(listType === 'ol' ? '</ol>' : '</ul>')
      inList = false
    }

    if (trimmed === '') { continue }

    result.push('<p style="font-size:28rpx;line-height:1.6;margin:0 0 8rpx 0;">' + processInline(trimmed) + '</p>')
  }

  if (inList) {
    result.push(listType === 'ol' ? '</ol>' : '</ul>')
  }

  return result.join('\n')
}

module.exports = {
  mdToHtml: mdToHtml
}
