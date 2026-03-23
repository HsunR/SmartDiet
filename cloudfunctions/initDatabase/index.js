const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const FOOD_DATA = [
  { name: '米饭', category: '主食', nutrients: { calories: 116, protein: 2.6, fat: 0.3, carbohydrate: 25.9 } },
  { name: '馒头', category: '主食', nutrients: { calories: 223, protein: 7.0, fat: 1.1, carbohydrate: 47.0 } },
  { name: '面条', category: '主食', nutrients: { calories: 137, protein: 4.5, fat: 0.5, carbohydrate: 28.0 } },
  { name: '面包', category: '主食', nutrients: { calories: 265, protein: 8.3, fat: 3.3, carbohydrate: 50.0 } },
  { name: '粥', category: '主食', nutrients: { calories: 46, protein: 1.1, fat: 0.3, carbohydrate: 9.9 } },
  { name: '猪肉', category: '肉类', nutrients: { calories: 143, protein: 20.3, fat: 6.2, carbohydrate: 0 } },
  { name: '牛肉', category: '肉类', nutrients: { calories: 125, protein: 20.0, fat: 4.2, carbohydrate: 0 } },
  { name: '鸡肉', category: '肉类', nutrients: { calories: 167, protein: 19.3, fat: 9.4, carbohydrate: 0 } },
  { name: '鱼肉', category: '肉类', nutrients: { calories: 104, protein: 17.6, fat: 3.2, carbohydrate: 0 } },
  { name: '鸡蛋', category: '肉类', nutrients: { calories: 144, protein: 13.3, fat: 8.8, carbohydrate: 2.8 } },
  { name: '白菜', category: '蔬菜', nutrients: { calories: 17, protein: 1.5, fat: 0.2, carbohydrate: 3.2 } },
  { name: '西红柿', category: '蔬菜', nutrients: { calories: 19, protein: 0.9, fat: 0.2, carbohydrate: 4.0 } },
  { name: '黄瓜', category: '蔬菜', nutrients: { calories: 15, protein: 0.8, fat: 0.2, carbohydrate: 2.9 } },
  { name: '土豆', category: '蔬菜', nutrients: { calories: 81, protein: 2.6, fat: 0.2, carbohydrate: 17.8 } },
  { name: '菠菜', category: '蔬菜', nutrients: { calories: 24, protein: 2.6, fat: 0.3, carbohydrate: 4.5 } },
  { name: '苹果', category: '水果', nutrients: { calories: 54, protein: 0.2, fat: 0.2, carbohydrate: 13.5 } },
  { name: '香蕉', category: '水果', nutrients: { calories: 93, protein: 1.2, fat: 0.2, carbohydrate: 22.0 } },
  { name: '橙子', category: '水果', nutrients: { calories: 48, protein: 0.8, fat: 0.2, carbohydrate: 11.8 } },
  { name: '西瓜', category: '水果', nutrients: { calories: 26, protein: 0.6, fat: 0.1, carbohydrate: 5.8 } },
  { name: '葡萄', category: '水果', nutrients: { calories: 45, protein: 0.4, fat: 0.4, carbohydrate: 10.3 } },
  { name: '牛奶', category: '乳制品', nutrients: { calories: 65, protein: 3.3, fat: 3.6, carbohydrate: 4.9 } },
  { name: '酸奶', category: '乳制品', nutrients: { calories: 72, protein: 2.5, fat: 2.7, carbohydrate: 9.3 } },
  { name: '豆浆', category: '饮品', nutrients: { calories: 31, protein: 1.8, fat: 1.1, carbohydrate: 3.0 } },
  { name: '果汁', category: '饮品', nutrients: { calories: 45, protein: 0.2, fat: 0.1, carbohydrate: 11.0 } }
]

exports.main = async (event, context) => {
  try {
    const foodCollection = db.collection('food_database')
    
    let countResult
    try {
      countResult = await foodCollection.count()
    } catch (countError) {
      if (countError.errCode === -502005) {
        console.log('集合不存在，开始创建集合并初始化数据...')
        
        const addPromises = FOOD_DATA.map(food => {
          return foodCollection.add({
            data: {
              ...food,
              createdAt: new Date()
            }
          })
        })
        
        await Promise.all(addPromises)
        
        return {
          success: true,
          message: `集合创建成功，已初始化 ${FOOD_DATA.length} 条食物数据`
        }
      }
      throw countError
    }
    
    if (countResult.total === 0) {
      const addPromises = FOOD_DATA.map(food => {
        return foodCollection.add({
          data: {
            ...food,
            createdAt: new Date()
          }
        })
      })
      
      await Promise.all(addPromises)
      
      return {
        success: true,
        message: `成功初始化 ${FOOD_DATA.length} 条食物数据`
      }
    } else {
      return {
        success: true,
        message: `数据库已有 ${countResult.total} 条数据，跳过初始化`
      }
    }
  } catch (error) {
    console.error('Init database error:', error)
    return {
      success: false,
      error: error.message,
      errCode: error.errCode
    }
  }
}
