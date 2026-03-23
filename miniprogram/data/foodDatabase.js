const FOOD_DATABASE = {
  staple: [
    {
      name: '米饭',
      category: '主食',
      nutrients: {
        calories: 116,
        protein: 2.6,
        fat: 0.3,
        carbohydrate: 25.9,
        fiber: 0.3
      }
    },
    {
      name: '馒头',
      category: '主食',
      nutrients: {
        calories: 223,
        protein: 7.0,
        fat: 1.1,
        carbohydrate: 47.0,
        fiber: 1.3
      }
    },
    {
      name: '面条',
      category: '主食',
      nutrients: {
        calories: 137,
        protein: 4.5,
        fat: 0.5,
        carbohydrate: 28.0,
        fiber: 0.8
      }
    },
    {
      name: '面包',
      category: '主食',
      nutrients: {
        calories: 265,
        protein: 8.3,
        fat: 3.3,
        carbohydrate: 50.0,
        fiber: 2.7
      }
    },
    {
      name: '粥',
      category: '主食',
      nutrients: {
        calories: 46,
        protein: 1.1,
        fat: 0.3,
        carbohydrate: 9.9,
        fiber: 0.1
      }
    }
  ],
  meat: [
    {
      name: '猪肉',
      category: '肉类',
      nutrients: {
        calories: 143,
        protein: 20.3,
        fat: 6.2,
        carbohydrate: 0,
        fiber: 0
      }
    },
    {
      name: '牛肉',
      category: '肉类',
      nutrients: {
        calories: 125,
        protein: 20.0,
        fat: 4.2,
        carbohydrate: 0,
        fiber: 0
      }
    },
    {
      name: '鸡肉',
      category: '肉类',
      nutrients: {
        calories: 167,
        protein: 19.3,
        fat: 9.4,
        carbohydrate: 0,
        fiber: 0
      }
    },
    {
      name: '鱼肉',
      category: '肉类',
      nutrients: {
        calories: 104,
        protein: 17.6,
        fat: 3.2,
        carbohydrate: 0,
        fiber: 0
      }
    },
    {
      name: '鸡蛋',
      category: '肉类',
      nutrients: {
        calories: 144,
        protein: 13.3,
        fat: 8.8,
        carbohydrate: 2.8,
        fiber: 0
      }
    }
  ],
  vegetable: [
    {
      name: '白菜',
      category: '蔬菜',
      nutrients: {
        calories: 17,
        protein: 1.5,
        fat: 0.2,
        carbohydrate: 3.2,
        fiber: 0.8
      }
    },
    {
      name: '西红柿',
      category: '蔬菜',
      nutrients: {
        calories: 19,
        protein: 0.9,
        fat: 0.2,
        carbohydrate: 4.0,
        fiber: 0.5
      }
    },
    {
      name: '黄瓜',
      category: '蔬菜',
      nutrients: {
        calories: 15,
        protein: 0.8,
        fat: 0.2,
        carbohydrate: 2.9,
        fiber: 0.5
      }
    },
    {
      name: '土豆',
      category: '蔬菜',
      nutrients: {
        calories: 81,
        protein: 2.6,
        fat: 0.2,
        carbohydrate: 17.8,
        fiber: 1.2
      }
    },
    {
      name: '菠菜',
      category: '蔬菜',
      nutrients: {
        calories: 24,
        protein: 2.6,
        fat: 0.3,
        carbohydrate: 4.5,
        fiber: 1.7
      }
    }
  ],
  fruit: [
    {
      name: '苹果',
      category: '水果',
      nutrients: {
        calories: 54,
        protein: 0.2,
        fat: 0.2,
        carbohydrate: 13.5,
        fiber: 1.2
      }
    },
    {
      name: '香蕉',
      category: '水果',
      nutrients: {
        calories: 93,
        protein: 1.2,
        fat: 0.2,
        carbohydrate: 22.0,
        fiber: 1.8
      }
    },
    {
      name: '橙子',
      category: '水果',
      nutrients: {
        calories: 48,
        protein: 0.8,
        fat: 0.2,
        carbohydrate: 11.8,
        fiber: 0.6
      }
    },
    {
      name: '西瓜',
      category: '水果',
      nutrients: {
        calories: 26,
        protein: 0.6,
        fat: 0.1,
        carbohydrate: 5.8,
        fiber: 0.3
      }
    },
    {
      name: '葡萄',
      category: '水果',
      nutrients: {
        calories: 45,
        protein: 0.4,
        fat: 0.4,
        carbohydrate: 10.3,
        fiber: 0.4
      }
    }
  ],
  dairy: [
    {
      name: '牛奶',
      category: '乳制品',
      nutrients: {
        calories: 65,
        protein: 3.3,
        fat: 3.6,
        carbohydrate: 4.9,
        fiber: 0
      }
    },
    {
      name: '酸奶',
      category: '乳制品',
      nutrients: {
        calories: 72,
        protein: 2.5,
        fat: 2.7,
        carbohydrate: 9.3,
        fiber: 0
      }
    },
    {
      name: '奶酪',
      category: '乳制品',
      nutrients: {
        calories: 328,
        protein: 25.7,
        fat: 23.5,
        carbohydrate: 3.5,
        fiber: 0
      }
    }
  ],
  beverage: [
    {
      name: '豆浆',
      category: '饮品',
      nutrients: {
        calories: 31,
        protein: 1.8,
        fat: 1.1,
        carbohydrate: 3.0,
        fiber: 0.1
      }
    },
    {
      name: '果汁',
      category: '饮品',
      nutrients: {
        calories: 45,
        protein: 0.2,
        fat: 0.1,
        carbohydrate: 11.0,
        fiber: 0.2
      }
    },
    {
      name: '咖啡',
      category: '饮品',
      nutrients: {
        calories: 2,
        protein: 0.1,
        fat: 0,
        carbohydrate: 0.4,
        fiber: 0
      }
    }
  ],
  snack: [
    {
      name: '薯片',
      category: '零食',
      nutrients: {
        calories: 536,
        protein: 7.0,
        fat: 35.0,
        carbohydrate: 50.0,
        fiber: 3.8
      }
    },
    {
      name: '饼干',
      category: '零食',
      nutrients: {
        calories: 433,
        protein: 6.1,
        fat: 15.0,
        carbohydrate: 70.0,
        fiber: 1.8
      }
    },
    {
      name: '巧克力',
      category: '零食',
      nutrients: {
        calories: 589,
        protein: 4.3,
        fat: 40.0,
        carbohydrate: 51.0,
        fiber: 2.0
      }
    }
  ]
}

const NUTRIENT_REFERENCES = {
  calories: {
    name: '热量',
    unit: 'kcal',
    dailyValue: {
      male: { min: 2000, max: 2500 },
      female: { min: 1800, max: 2200 }
    }
  },
  protein: {
    name: '蛋白质',
    unit: 'g',
    dailyValue: {
      male: { min: 65, max: 90 },
      female: { min: 55, max: 75 }
    }
  },
  fat: {
    name: '脂肪',
    unit: 'g',
    dailyValue: {
      male: { min: 50, max: 80 },
      female: { min: 45, max: 65 }
    }
  },
  carbohydrate: {
    name: '碳水化合物',
    unit: 'g',
    dailyValue: {
      male: { min: 300, max: 400 },
      female: { min: 250, max: 350 }
    }
  },
  fiber: {
    name: '膳食纤维',
    unit: 'g',
    dailyValue: {
      male: { min: 25, max: 35 },
      female: { min: 20, max: 30 }
    }
  },
  vitaminA: {
    name: '维生素A',
    unit: 'μg',
    dailyValue: {
      male: { min: 800, max: 3000 },
      female: { min: 700, max: 3000 }
    }
  },
  vitaminC: {
    name: '维生素C',
    unit: 'mg',
    dailyValue: {
      male: { min: 90, max: 2000 },
      female: { min: 75, max: 2000 }
    }
  },
  vitaminD: {
    name: '维生素D',
    unit: 'μg',
    dailyValue: {
      male: { min: 10, max: 50 },
      female: { min: 10, max: 50 }
    }
  },
  calcium: {
    name: '钙',
    unit: 'mg',
    dailyValue: {
      male: { min: 800, max: 2000 },
      female: { min: 800, max: 2000 }
    }
  },
  iron: {
    name: '铁',
    unit: 'mg',
    dailyValue: {
      male: { min: 12, max: 42 },
      female: { min: 20, max: 42 }
    }
  }
}

const searchFood = (keyword) => {
  const results = []
  const lowerKeyword = keyword.toLowerCase()
  
  Object.values(FOOD_DATABASE).forEach(category => {
    category.forEach(food => {
      if (food.name.toLowerCase().includes(lowerKeyword)) {
        results.push(food)
      }
    })
  })
  
  return results
}

const getFoodNutrients = (name, weight = 100) => {
  const foods = searchFood(name)
  if (foods.length === 0) return null
  
  const food = foods[0]
  const ratio = weight / 100
  
  return {
    ...food,
    nutrients: {
      calories: Math.round(food.nutrients.calories * ratio),
      protein: Math.round(food.nutrients.protein * ratio * 10) / 10,
      fat: Math.round(food.nutrients.fat * ratio * 10) / 10,
      carbohydrate: Math.round(food.nutrients.carbohydrate * ratio * 10) / 10,
      fiber: Math.round(food.nutrients.fiber * ratio * 10) / 10
    }
  }
}

module.exports = {
  FOOD_DATABASE,
  NUTRIENT_REFERENCES,
  searchFood,
  getFoodNutrients
}
