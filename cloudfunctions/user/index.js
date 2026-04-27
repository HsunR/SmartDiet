/**
 * @module user
 * @description 用户管理云函数 - 处理用户登录、信息查询和更新
 */

const cloud = require('wx-server-sdk')
const { success, fail, withErrorHandling } = require('./response')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const COLLECTION_NAME = 'users'

const getUsersCollection = () => db.collection(COLLECTION_NAME)

const handleLogin = async openid => {
  try {
    const userResult = await getUsersCollection().where({ openid }).get()
    
    if (!userResult.data || userResult.data.length === 0) {
      const newUser = {
        openid,
        nickname: '',
        avatar: '',
        gender: 0,
        age: 25,
        height: 170,
        weight: 65,
        activityLevel: 3,
        goal: 'maintain',
        preferences: [],
        allergies: [],
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      
      await getUsersCollection().add({ data: newUser })
      
      return success({ openid, ...newUser }, '新用户创建成功', true)
    }
    
    return success(userResult.data[0], '登录成功', false)
  } catch (error) {
    console.error('Login error:', error)
    return fail(error.message || '登录失败')
  }
}

const getUserInfo = async openid => {
  const result = await getUsersCollection().where({ openid }).get()
  
  if (result.data && result.data.length > 0) {
    return success(result.data[0])
  }
  
  return fail('用户不存在')
}

const updateUserInfo = async (openid, data) => {
  await getUsersCollection().where({ openid }).update({
    data: {
      ...data,
      updatedAt: db.serverDate()
    }
  })
  
  return success(null, '更新成功')
}

const getUserProfile = async openid => {
  const result = await getUsersCollection().where({ openid }).get()
  
  if (result.data && result.data.length > 0) {
    const user = result.data[0]
    const profile = {
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      gender: user.gender || 0,
      age: user.age || 25,
      height: user.height || 170,
      weight: user.weight || 65,
      activityLevel: user.activityLevel || 3,
      goal: user.goal || 'maintain',
      preferences: user.preferences || [],
      allergies: user.allergies || []
    }
    return success(profile)
  }
  
  return fail('用户不存在')
}

const updateUserProfile = async (openid, data) => {
  const { profile } = data
  
  await getUsersCollection().where({ openid }).update({
    data: {
      ...profile,
      updatedAt: db.serverDate()
    }
  })
  
  return success(null, '档案更新成功')
}

exports.main = withErrorHandling(async event => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  switch (action) {
    case 'login':
      return await handleLogin(openid)
    case 'getInfo':
      return await getUserInfo(openid)
    case 'updateInfo':
      return await updateUserInfo(openid, data)
    case 'getProfile':
      return await getUserProfile(openid)
    case 'updateProfile':
      return await updateUserProfile(openid, data)
    default:
      return fail('未知操作')
  }
})
