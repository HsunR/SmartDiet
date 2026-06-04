const { api, safeApiCall } = require('../utils/api')

const chooseImage = () => {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: res => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        resolve(sourceType)
      },
      fail: reject
    })
  })
}

const pickImage = async sourceType => {
  const chooseResult = await wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType,
    sizeType: ['compressed']
  })
  return chooseResult.tempFiles[0].tempFilePath
}

const processImage = async tempFilePath => {
  const result = await safeApiCall(() => api.upload(tempFilePath))
  if (result.success && result.data?.url) {
    return { fileID: result.data.url, tempUrl: result.data.url }
  }
  return { fileID: tempFilePath, tempUrl: tempFilePath }
}

const previewImage = url => {
  wx.previewImage({ urls: [url], current: url })
}

module.exports = {
  chooseImage,
  pickImage,
  processImage,
  previewImage,
}
