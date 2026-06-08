# SmartDiet

AI 营养师智能饮食管理微信小程序。

## 项目结构

```
smartdiet-backend/    # FastAPI 后端 (Python 3.12+, PostgreSQL 16)
miniprogram/          # 微信小程序前端 (原生 WXML/WXSS/JS)
```

## 关键命令

```bash
# 后端
cd smartdiet-backend
pip install -r requirements.txt          # 安装依赖
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000  # 启动开发服务
alembic upgrade head                      # 执行数据库迁移
alembic revision --autogenerate -m "msg"  # 生成迁移
pytest                                    # 运行全部测试
pytest tests/test_food_api.py -v          # 运行单个测试文件

# Docker
docker-compose up -d                      # 启动全套服务
docker-compose logs -f app                # 查看后端日志

# 小程序
# 使用微信开发者工具打开根目录，无需额外构建步骤
```

## 测试

- **pytest.ini**: `asyncio_mode = auto`，测试函数自动支持 async
- **conftest.py**: SQLite 内存数据库覆写 `get_db` 依赖，`auth_client` fixture 自动注入登录态
- **测试依赖**: `aiosqlite`（仅测试用）、`httpx`（AsyncClient）
- 运行: `cd smartdiet-backend && pytest`

## 代码规范

### Python (FastAPI)

- **Pydantic schemas** 继承 `CamelModel`（`app/schemas/base.py`），自动将 `snake_case` 字段转为 `camelCase` JSON。Python 内始终用 snake_case，前端 JSON 始终用 camelCase
- **异常** 使用 `app/core/exceptions.py` 的 `AppException` 体系（BadRequest/Unauthorized/NotFound/InternalError），统一返回 `{"code": "...", "message": "..."}`
- **数据库** SQLAlchemy 2.0 async ORM，`get_db()` 注入 `AsyncSession`，已自动 commit/rollback
- **路由** 按模块拆分到 `app/api/v1/`，`app/main.py` 统一 include_router
- **AI 工作流** 用 LangGraph `StateGraph` 实现（`app/workflows/`），Chat 工作流含 intent 分类节点（classify_intent → handle_*）
- **流式响应** SSE 格式，miniprogram 用 `enableChunked: true` + `onChunkReceived` 解析 `data: {content, done}`

### JavaScript (小程序)

- **CommonJS** 模块（`require`/`module.exports`），不使用 ES module
- **API 调用** 通过 `utils/api.js` 的 `api` 对象和 `safeApiCall` 包装器
- **常量** 集中定义在 `utils/constants.js`（MESSAGE_TYPES, STORAGE_KEYS, API_BASE_URL 等）
- **API_BASE_URL**: 硬编码 `http://127.0.0.1:8000/api/v1`（`utils/constants.js:75`），生产需修改

### WXSS (样式)

- **CSS 变量** 定义在 `styles/variables.wxss`（`--primary-color`, `--spacing-*` 等）
- **组件类名** 使用 `styles/common.wxss` 的通用类（`.card`, `.btn`, `.tag`, `.flex` 等）
- **尺寸单位** 使用 `rpx`，间距用 `--spacing-*` 变量
- **后缀约定**：`-xs`/`-sm`/`-md`/`-lg`/`-xl` 递进

## 配置

环境变量（`.env`）：
- `DATABASE_URL`: PostgreSQL 连接串，Docker 内用 `db` 主机名
- `WECHAT_APPID` / `WECHAT_SECRET`: 微信小程序凭证，留空则使用 mock 登录
- `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`: AI 模型配置
- `LLM_VISION_MODEL`: 可选，默认同 `LLM_MODEL`
- `JWT_SECRET`: JWT 签名密钥

`docker-compose.yml` 会将以上变量透传给容器。容器内 `DATABASE_URL` 使用 `db` 主机名。

## 注意事项

- `miniprogram/assets/images/` 已被 `.gitignore` 排除（仅保留 `.gitkeep`），图片资源不提交 Git
- `app.js` 不做 `wx.cloud.init()`，项目已完全移除微信云开发依赖
- cloudfunctions/ 已删除，所有后端逻辑走 FastAPI（`http://127.0.0.1:8000/api/v1`）
- 首次启动 FastAPI 时 `lifespan` 会自动创建所有表（`Base.metadata.create_all`），但生产建议用 `alembic upgrade head`
- Pydantic v2 用 `model_validate()` 代替 v1 的 `from_orm()`
- 小程序 `app.json` 的 `libVersion` 为 `3.15.0`
