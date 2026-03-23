const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
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
      return { success: false, error: 'Unknown action' }
  }
}

async function handleLogin(openid) {
  try {
    const userResult = await usersCollection.where({ openid }).get()
    
    if (userResult.data.length === 0) {
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
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await usersCollection.add({ data: newUser })
      
      return {
        success: true,
        openid,
        data: newUser,
        isNewUser: true
      }
    } else {
      const user = userResult.data[0]
      return {
        success: true,
        openid,
        data: user,
        isNewUser: false
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: error.message }
  }
}

async function getUserInfo(openid) {
  try {
    const result = await usersCollection.where({ openid }).get()
    
    if (result.data.length > 0) {
      return { success: true, data: result.data[0] }
    } else {
      return { success: false, error: 'User not found' }
    }
  } catch (error) {
    console.error('Get user info error:', error)
    return { success: false, error: error.message }
  }
}

async function updateUserInfo(openid, data) {
  try {
    const result = await usersCollection.where({ openid }).update({
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Update user info error:', error)
    return { success: false, error: error.message }
  }
}

async function getUserProfile(openid) {
  try {
    const result = await usersCollection.where({ openid }).get()
    
    if (result.data.length > 0) {
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
      return { success: true, data: profile }
    } else {
      return { success: false, error: 'User not found' }
    }
  } catch (error) {
    console.error('Get user profile error:', error)
    return { success: false, error: error.message }
  }
}

async function updateUserProfile(openid, data) {
  try {
    const { profile } = data
    
    const result = await usersCollection.where({ openid }).update({
      data: {
        ...profile,
        updatedAt: new Date()
      }
    })
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Update user profile error:', error)
    return { success: false, error: error.message }
  }
}
