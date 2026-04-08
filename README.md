# SmartDiet - AI 饮食识别与健康建议小程序

## 项目概述

**SmartDiet** 是一款基于微信小程序开发的 AI 营养师应用，通过图像识别技术帮助用户轻松记录饮食，并提供个性化的健康建议。

### 主要功能

- 📷 **食物图像识别** - 拍照上传，AI 自动识别食物种类和营养成分
- 💬 **AI 对话助手** - 与 AI 营养师对话，获取专业饮食建议
- 📊 **营养报告** - 查看每日/每周营养摄入报告和趋势分析
- 📝 **饮食记录** - 历史饮食记录管理
- 👤 **个人档案** - 用户信息管理，个性化目标设定

### 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | 微信小程序原生开发 |
| 后端服务 | 微信云开发 (Cloud Base) |
| AI 服务 | 智谱 AI (Zhipu) / 通义千问 (Qwen) |
| 数据库 | 云开发数据库 |
| 存储 | 云开发存储 |

---

## 目录结构

```
SmartDiet/
├── miniprogram/              # 小程序前端代码
│   ├── pages/               # 页面
│   │   ├── chat/            # 聊天页
│   │   ├── report/          # 报告页
│   │   ├── profile/         # 个人页
│   │   ├── history/         # 历史记录
│   │   ├── login/           # 登录页
│   │   ├── onboarding/      # 新手引导
│   │   └── settings/        # 设置页
│   ├── components/          # 自定义组件
│   │   ├── food-card/       # 食物卡片组件
│   │   └── custom-tab-bar/  # 自定义 TabBar
│   ├── utils/               # 工具类
│   │   ├── api.js          # API 调用
│   │   ├── constants.js    # 常量定义
│   │   ├── util.js         # 工具函数
│   │   └── utils.wxs       # WXS 模块
│   ├── styles/              # 样式文件
│   │   ├── common.wxss     # 公共样式
│   │   └── variables.wxss  # 变量定义
│   ├── assets/              # 静态资源
│   │   └── icons/          # 图标
│   ├── app.js               # 入口文件
│   ├── app.json             # 配置文件
│   └── app.wxss             # 全局样式
├── cloudfunctions/          # 云函数
│   ├── aiGateway/          # AI 网关
│   ├── foodRecord/         # 饮食记录
│   ├── user/               # 用户管理
│   ├── report/             # 报告生成
│   └── initDatabase/       # 数据库初始化
├── docs/                    # 文档
└── project.config.json      # 项目配置
```

---

## 小程序前端

### 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 聊天 | `pages/chat` | 与 AI 对话、拍照识别食物 |
| 报告 | `pages/report` | 查看周/日营养报告 |
| 我的 | `pages/profile` | 个人信息管理 |
| 历史 | `pages/history` | 历史饮食记录 |
| 登录 | `pages/login` | 用户登录 |
| 引导 | `pages/onboarding` | 新用户信息收集 |
| 设置 | `pages/settings` | 应用设置 |

### 聊天页 (pages/chat)

核心功能页面，支持：
- 文本对话：与 AI 营养师交流
- 拍照识别：上传食物图片进行识别
- 交互式消息：支持餐次选择、日期选择、评分等
- 反馈修正：可对识别结果进行反馈修正

### 报告页 (pages/report)

展示营养摄入情况：
- 周视图：7 天营养摄入日历
- 日详情：查看某天的详细记录
- 编辑功能：修改已记录的饮食
- 营养趋势：查看摄入趋势

### 自定义组件

#### food-card

食物识别结果展示组件：
- 展示识别到的食物列表
- 显示营养信息和健康评分
- 支持展开/收起营养详情
- 可编辑和确认功能

#### custom-tab-bar

自定义底部导航栏：
- 3 个标签页：聊天、报告、我的
- 选中状态高亮
- 平滑切换动画

### 工具类

#### constants.js

常量定义和消息创建工厂：
- `MESSAGE_TYPES`: 消息类型枚举
- `MEAL_TYPES`: 餐次类型（早餐/午餐/晚餐/其他）
- `USER_GOALS`: 用户健康目标
- 消息创建函数：`createTextMessage()`, `createFoodCardMessage()` 等
- 营养计算：`calculateBMR()`, `calculateTDEE()`, `calculateTargetCalories()`

#### util.js

通用工具函数：
- 防抖/节流
- 日期格式化
- 数字验证
- 图片 URL 处理

---

## 云函数后端

### 云函数列表

| 函数 | 功能 |
|------|------|
| aiGateway | AI 服务网关，统一调用 AI 接口 |
| foodRecord | 饮食记录的增删改查 |
| user | 用户信息管理 |
| report | 报告数据聚合 |
| initDatabase | 数据库初始化 |

### AI Gateway 架构

#### 目录结构

```
cloudfunctions/aiGateway/
├── index.js          # 主入口
├── ai-service.js     # AI 服务封装
├── ai-config.js      # AI 配置管理
└── providers/        # AI 提供商实现
    ├── base-provider.js
    ├── zhipu-provider.js
    ├── qwen-provider.js
    └── index.js
```

#### 支持的 AI 提供商

- **智谱 AI (Zhipu)** - GLM 系列模型
- **通义千问 (Qwen)** - Qwen 系列模型

#### 主要接口

| Action | 功能 |
|--------|------|
| foodRecognition | 食物图像识别和营养分析 |
| chat | 通用对话 |

#### 提示词模板

**食物识别提示词**：
- 角色：AI 营养师
- 输入：食物图片、用户信息、用户反馈
- 输出：JSON 格式，包含食物列表、营养信息、健康评分

**对话提示词**：
- 角色：AI 营养师助手
- 输入：用户消息、用户信息、最近饮食、对话历史
- 输出：自然语言回复

### 数据库设计

#### 集合：food_records

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | String | 记录 ID |
| openid | String | 用户 OpenID |
| date | String | 日期 (YYYY-MM-DD) |
| mealType | String | 餐次类型 |
| foods | Array | 食物列表 |
| totalCalories | Number | 总热量 |
| createdAt | Date | 创建时间 |

#### 集合：users

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | String | 用户 ID |
| openid | String | 用户 OpenID |
| nickName | String | 昵称 |
| avatarUrl | String | 头像 URL |
| gender | Number | 性别 |
| age | Number | 年龄 |
| height | Number | 身高 (cm) |
| weight | Number | 体重 (kg) |
| activityLevel | Number | 活动水平 |
| goal | String | 健康目标 |
| createdAt | Date | 创建时间 |

---

## 开发指南

### 环境要求

- 微信开发者工具 (最新版本)
- 微信小程序开发账号
- 微信云开发环境

### 配置步骤

1. **打开项目**
   ```
   使用微信开发者工具打开项目目录
   ```

2. **配置云开发环境**
   - 在 `project.config.json` 中确认 appid
   - 在 `miniprogram/app.js` 中配置云环境 ID：
     ```javascript
     wx.cloud.init({
       env: 'your-env-id',  // 替换为你的环境 ID
       traceUser: true,
     })
     ```

3. **上传云函数**
   - 在微信开发者工具中右键云函数文件夹
   - 选择"上传并部署：云端安装依赖"

4. **配置 AI 服务**
   - 在 `cloudfunctions/aiGateway/ai-config.js` 中配置 API Key
   - 支持智谱 AI 和通义千问

5. **初始化数据库**
   - 上传并运行 `initDatabase` 云函数

### 目录配置

- **小程序根目录**：`miniprogram/`
- **云函数根目录**：`cloudfunctions/`
- **云环境 ID**：在 `app.js` 和云函数中配置

---

## 部署流程

### 小程序发布

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 登录微信公众平台提交审核
4. 审核通过后发布

### 云函数发布

云函数在上传后会自动部署到云端，无需额外操作。

---

## 注意事项

1. **用户隐私**：所有数据存储在微信云开发，符合微信隐私规范
2. **API Key**：AI 服务的 API Key 需妥善保管，不要提交到代码仓库
3. **云开发配额**：注意云开发的免费配额限制
4. **图片上传**：上传的图片会临时存储在云存储中

---

## 许可证

本项目仅供学习和研究使用。

---

## 联系方式

如有问题或建议，欢迎反馈。
