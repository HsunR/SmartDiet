const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const recordsCollection = db.collection('food_records')

exports.main = async (event, context) => {
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
      return { success: false, error: 'Unknown action' }
  }
}

async function addRecord(openid, recordData) {
  try {
    const record = {
      ...recordData,
      _openid: openid,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await recordsCollection.add({ data: record })
    
    return { 
      success: true, 
      data: { 
        _id: result._id,
        ...record 
      } 
    }
  } catch (error) {
    console.error('Add record error:', error)
    return { success: false, error: error.message }
  }
}

async function getRecordsByDate(openid, date) {
  try {
    const result = await recordsCollection
      .where({
        _openid: openid,
        date: date
      })
      .orderBy('createdAt', 'desc')
      .get()
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Get records by date error:', error)
    return { success: false, error: error.message }
  }
}

async function getHistory(openid, startDate, endDate) {
  try {
    const result = await recordsCollection
      .where({
        _openid: openid,
        date: _.gte(startDate).and(_.lte(endDate))
      })
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Get history error:', error)
    return { success: false, error: error.message }
  }
}

async function deleteRecord(openid, recordId) {
  try {
    const result = await recordsCollection
      .where({
        _id: recordId,
        _openid: openid
      })
      .remove()
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Delete record error:', error)
    return { success: false, error: error.message }
  }
}

async function updateRecord(openid, recordId, updateData) {
  try {
    const { recordId: _, ...data } = updateData
    
    const result = await recordsCollection
      .where({
        _id: recordId,
        _openid: openid
      })
      .update({
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Update record error:', error)
    return { success: false, error: error.message }
  }
}
