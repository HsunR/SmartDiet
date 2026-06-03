# SmartDiet 后端重构设计

## 概述

将 SmartDiet（AI营养师微信小程序）从腾讯云函数后端迁移到自建 Python 后端，使用 FastAPI + LangChain + LangGraph + PostgreSQL 技术栈，支持本地部署开发。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | FastAPI |
| AI 编排 | LangChain + LangGraph (StateGraph Workflow) |
| 数据库 | PostgreSQL (JSONB) |
| ORM | SQLAlchemy 2.0 + asyncpg |
| 迁移 | Alembic |
| 模型 | 通义千问 DashScope / 智谱 GLM（可配置切换） |
| 部署 | Docker Compose（本地开发） |

## 目录结构

```
smartdiet-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app 入口
│   ├── api/                       # 路由层
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── food.py            # 饮食记录 CRUD
│   │       ├── chat.py            # 对话接口
│   │       ├── user.py            # 用户管理
│   │       └── report.py          # 报告生成
│   ├── core/                      # 基础设施
│   │   ├── __init__.py
│   │   ├── config.py              # 配置（pydantic-settings）
│   │   ├── database.py            # 异步 SQLAlchemy session
│   │   └── dependencies.py        # FastAPI 依赖注入
│   ├── models/                    # SQLAlchemy ORM 模型
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── food_record.py
│   │   ├── conversation.py
│   │   └── message.py
│   ├── schemas/                   # Pydantic 请求/响应
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── food.py
│   │   ├── chat.py
│   │   └── report.py
│   ├── services/                  # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── food.py
│   │   ├── chat.py
│   │   └── ai.py                  # LangChain LLM 封装
│   └── workflows/                 # LangGraph StateGraph
│       ├── __init__.py
│       ├── food_recognition.py    # 食物识别 workflow
│       ├── chat.py                # 对话 workflow
│       └── report.py              # 周报 workflow
├── alembic/
│   ├── env.py
│   └── versions/
├── tests/
│   ├── conftest.py
│   ├── test_api/
│   ├── test_services/
│   └── test_workflows/
├── requirements.txt
├── docker-compose.yml             # PostgreSQL + app
├── Dockerfile
└── .env.example
```

## 数据模型

### users

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| openid | VARCHAR(128) UNIQUE | 微信 OpenID |
| nickname | VARCHAR(64) | |
| avatar | VARCHAR(512) | |
| gender | SMALLINT | 0/1/2 |
| age | SMALLINT | |
| height | DECIMAL(5,1) | cm |
| weight | DECIMAL(5,1) | kg |
| activity_level | SMALLINT | 1-5 |
| goal | VARCHAR(16) | lose/maintain/gain |
| preferences | JSONB | 饮食偏好 |
| allergies | JSONB | 过敏信息 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### food_records

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| date | DATE | |
| meal_type | VARCHAR(16) | breakfast/lunch/dinner/snack |
| foods | JSONB | `[{name, category, score, weight, tags, advice}]` |
| meal_overview | JSONB | `{overall_score, health_tags, summary}` |
| image_url | VARCHAR(512) | 原始图片 URL |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### conversations

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| title | VARCHAR(128) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### messages

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| conversation_id | UUID FK → conversations | |
| role | VARCHAR(16) | user/assistant/system |
| content | TEXT | |
| metadata | JSONB | AI 原始响应、图片 URL 等 |
| created_at | TIMESTAMPTZ | |

### 索引

- food_records: (user_id, date, meal_type) 复合索引
- messages: (conversation_id, created_at)
- users: (openid) 唯一索引

## API 路由

```
POST   /api/v1/users/login              # 微信登录
GET    /api/v1/users/me                 # 获取当前用户
PATCH  /api/v1/users/me                 # 更新用户信息

POST   /api/v1/records                  # 添加饮食记录（支持图片识别）
GET    /api/v1/records?date=YYYY-MM-DD  # 按日期查询
GET    /api/v1/records/history          # 查询历史范围
DELETE /api/v1/records/{id}             # 删除记录
PATCH  /api/v1/records/{id}             # 修改记录

POST   /api/v1/chat/messages            # 发送消息（流式响应）
GET    /api/v1/chat/conversations       # 对话列表
GET    /api/v1/chat/conversations/{id}  # 历史消息
DELETE /api/v1/chat/conversations/{id}  # 删除对话

GET    /api/v1/reports/weekly           # 周报
```

## LangGraph Workflow 设计

### 原则

- 每个 Workflow 是一个 `StateGraph`，state 为 Pydantic model
- Node 是纯函数或 service 调用，可独立测试
- 只对需要多步编排的 AI 流程使用 Graph，简单 CRUD 不走 Graph
- 模型通过 LangChain 抽象层切换（Qwen vs GLM 只需改配置）

### 食物识别 Workflow

```
State: FoodRecognitionState
  - image_url: str
  - user_id: UUID
  - raw_ai_response: Optional[str]
  - parsed_foods: Optional[list]
  - meal_overview: Optional[dict]
  - dietary_advice: Optional[str]

Nodes:
  [validate_image] → 校验图片 URL 和格式，不合法则终止
  [recognize_food] → LangChain 调多模态模型，解析 JSON
  [enrich_with_user] → 查用户画像/饮食历史，计算综合评分
  [generate_advice] → 生成个性化饮食建议
  [save_record] → 写入 food_records 表
```

### 对话 Workflow

```
State: ChatState
  - user_id: UUID
  - message: str
  - conversation_id: UUID
  - history: list[dict]
  - intent: Optional[str]
  - reply: Optional[str]

Nodes:
  [load_history] → 从数据库加载最近 N 条消息
  [classify_intent] → LangChain 判断意图：advice/query/chat/image
  [handle_advice] → 查饮食记录 → 生成饮食建议回复
  [handle_query] → 查数据库 → 返回数据
  [handle_chat] → 普通对话 → AI 回复
  [handle_image] → 包含图片 → 路由到食物识别
  [save_messages] → 保存用户消息和 AI 回复
```

### 周报 Workflow（后续扩展）

```
State: ReportState
  - user_id: UUID
  - week_start: date
  - records: list
  - analysis: Optional[dict]
  - report: Optional[str]
```

## 应用层架构

### API 层（FastAPI）
- 只做请求解析、参数校验、响应序列化
- 调用 Service 层，不直接调用 Workflow
- 登录接口通过微信 code 换取 openid + JWT

### Service 层
- 封装业务逻辑，组合多个 Workflow 或 DB 操作
- 依赖注入：Session、LLM、Workflow
- 抛出自定义异常，由全局异常处理器捕获

### Workflow 层
- 封装 LangGraph StateGraph
- 每个 workflow 对外暴露一个 async `run(state) → state` 方法
- 内部编译一次（`graph.compile()`），复用实例

## 错误处理

- 自定义 `AppException`，含 code + message + status_code
- FastAPI 全局 `@app.exception_handler`
- AI 调用失败 → 降级返回友好提示，不阻塞请求
- 数据库异常 → 500 + 日志，不暴露细节

## 测试策略

- `pytest` + `pytest-asyncio`
- 单元测试：每个 Workflow node 独立测试（mock LLM）
- 集成测试：API 层用 TestClient，SQLite 或测试 PostgreSQL
- Workflow 集成测试：用真实模型或录制的 fixture 响应

## 部署（本地开发）

Docker Compose 编排：
- `postgres:16` — 数据库
- `app` — FastAPI + uvicorn，热重载

```
docker compose up
```
