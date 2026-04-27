/**
 * @module foodRecord
 * @description 饮食记录云函数 - 管理用户的饮食记录数据
 */

const cloud = require('wx-server-sdk')
const { success, fail, withErrorHandling, validate } = require('./response')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLLECTION_NAME = 'food_records'

const getCollection = () => db.collection(COLLECTION_NAME)

const addRecord = async (openid, recordData) => {
  const errors = validate(recordData, {
    date: { required: true, label: '日期' },
    mealType: { required: true, label: '餐次类型' },
    foods: { required: true, type: 'object', label: '食物列表' }
  })
  
  if (errors.length > 0) {
    return fail(errors.join(', '))
  }
  
  const record = {
    ...recordData,
    _openid: openid,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  
  const result = await getCollection().add({ data: record })
  
  return success({ _id: result._id, ...record })
}

const getRecordsByDate = async (openid, date) => {
  if (!date) {
    return fail('日期不能为空')
  }
  
  const result = await getCollection()
    .where({ _openid: openid, date })
    .orderBy('createdAt', 'desc')
    .get()
  
  return success(result.data)
}

const getHistory = async (openid, startDate, endDate) => {
  if (!startDate || !endDate) {
    return fail('开始日期和结束日期不能为空')
  }
  
  const result = await getCollection()
    .where({
      _openid: openid,
      date: _.gte(startDate).and(_.lte(endDate))
    })
    .orderBy('date', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()
  
  return success(result.data)
}

const deleteRecord = async (openid, recordId) => {
  if (!recordId) {
    return fail('记录ID不能为空')
  }
  
  await getCollection()
    .where({ _id: recordId, _openid: openid })
    .remove()
  
  return success({ recordId })
}

const updateRecord = async (openid, recordId, updateData) => {
  if (!recordId) {
    return fail('记录ID不能为空')
  }
  
  const { recordId: _, ...data } = updateData
  
  await getCollection()
    .where({ _id: recordId, _openid: openid })
    .update({
      data: {
        ...data,
        updatedAt: db.serverDate()
      }
    })
  
  return success({ recordId })
}

exports.main = withErrorHandling(async (event) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  switch (action) {
    case 'add':
      return await addRecord(openid, data)
    case 'getByDate':
      return await getRecordsByDate(openid, data.date)
    case 'getHistory':
      return await getHistory(openid, data.startDate, data.endDate)
    case 'delete':
      return await deleteRecord(openid, data.recordId)
    case 'update':
      return await updateRecord(openid, data.recordId, data)
    default:
      return fail('未知操作')
  }
})
