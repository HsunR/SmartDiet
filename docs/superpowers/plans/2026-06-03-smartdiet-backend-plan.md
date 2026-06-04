# SmartDiet Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI + LangChain + LangGraph backend to replace the existing WeChat cloud function backend for SmartDiet

**Architecture:** Three-layer architecture: FastAPI routes → Service layer → LangGraph Workflows. PostgreSQL with JSONB for flexible food records. LangChain abstracts LLM providers (Qwen/GLM), LangGraph manages multi-step AI workflows (food recognition, chat with intent classification).

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Alembic, LangChain, LangGraph, Pydantic, Docker Compose, pytest

---

### Task 1: Project Scaffold

**Files:**
- Create: `smartdiet-backend/requirements.txt`
- Create: `smartdiet-backend/app/__init__.py`
- Create: `smartdiet-backend/app/main.py`
- Create: `smartdiet-backend/app/core/__init__.py`
- Create: `smartdiet-backend/app/core/config.py`
- Create: `smartdiet-backend/app/core/database.py`
- Create: `smartdiet-backend/.env.example`
- Create: `smartdiet-backend/Dockerfile`
- Create: `smartdiet-backend/docker-compose.yml`

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.0
pydantic-settings==2.7.0
python-jose[cryptography]==3.3.0
httpx==0.28.1
langchain==0.3.14
langchain-core==0.3.29
langgraph==0.2.59
langchain-community==0.3.14
dashscope==1.20.0
zhipuai==2.1.5.20240309
pytest==8.3.4
pytest-asyncio==0.24.0
pytest-cov==6.0.0
aiosqlite==0.20.0
```

- [ ] **Step 2: Write core/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://smartdiet:smartdiet@localhost:5432/smartdiet"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    llm_provider: str = "dashscope"  # dashscope | zhipu
    dashscope_api_key: str = ""
    zhipu_api_key: str = ""
    dashscope_model: str = "qwen-vl-plus"
    zhipu_model: str = "glm-4v-plus"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 3: Write core/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

- [ ] **Step 4: Write app/main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="SmartDiet API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Write Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 6: Write docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: smartdiet
      POSTGRES_PASSWORD: smartdiet
      POSTGRES_DB: smartdiet
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://smartdiet:smartdiet@db:5432/smartdiet
      DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY}
      ZHIPU_API_KEY: ${ZHIPU_API_KEY}
    depends_on:
      - db
    volumes:
      - .:/app

volumes:
  pgdata:
```

- [ ] **Step 7: Write .env.example**

```
DASHSCOPE_API_KEY=your-dashscope-api-key
ZHIPU_API_KEY=your-zhipu-api-key
JWT_SECRET=change-me-in-production
```

- [ ] **Step 8: Write __init__.py files**

`app/__init__.py` and `app/core/__init__.py` — both empty files.

- [ ] **Step 9: Write tests/conftest.py for the scaffold test**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 10: Run test to verify**

Run from `smartdiet-backend/`:
```bash
pytest tests/test_scaffold.py -v
```
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add smartdiet-backend/
git commit -m "feat: add project scaffold with FastAPI, Docker Compose, and health endpoint"
```

---

### Task 2: Data Models + Alembic

**Files:**
- Create: `smartdiet-backend/app/models/__init__.py`
- Create: `smartdiet-backend/app/models/user.py`
- Create: `smartdiet-backend/app/models/food_record.py`
- Create: `smartdiet-backend/app/models/conversation.py`
- Create: `smartdiet-backend/app/models/message.py`
- Create: `smartdiet-backend/alembic.ini`
- Create: `smartdiet-backend/alembic/env.py`
- Create: `smartdiet-backend/alembic/script.py.mako`

- [ ] **Step 1: Write models/__init__.py**

```python
from app.models.user import User
from app.models.food_record import FoodRecord
from app.models.conversation import Conversation
from app.models.message import Message

__all__ = ["User", "FoodRecord", "Conversation", "Message"]
```

- [ ] **Step 2: Write models/user.py**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, SmallInteger, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    openid = Column(String(128), unique=True, nullable=False, index=True)
    nickname = Column(String(64), default="")
    avatar = Column(String(512), default="")
    gender = Column(SmallInteger, default=0)
    age = Column(SmallInteger, default=25)
    height = Column(Numeric(5, 1), default=170)
    weight = Column(Numeric(5, 1), default=65)
    activity_level = Column(SmallInteger, default=3)
    goal = Column(String(16), default="maintain")
    preferences = Column(JSONB, default=list)
    allergies = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 3: Write models/food_record.py**

```python
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class FoodRecord(Base):
    __tablename__ = "food_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    meal_type = Column(String(16), nullable=False)
    foods = Column(JSONB, default=list)
    meal_overview = Column(JSONB, default=dict)
    image_url = Column(String(512), default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 4: Write models/conversation.py**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(128), default="新对话")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 5: Write models/message.py**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    content = Column(Text, default="")
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 6: Initialize Alembic**

```bash
cd smartdiet-backend
alembic init alembic
```

- [ ] **Step 7: Configure alembic/env.py**

```python
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.core.database import Base
from app.core.config import settings
from app.models import *  # noqa: F401, F403

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url.replace("+asyncpg", ""))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = settings.database_url
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 8: Generate and run initial migration**

```bash
cd smartdiet-backend
alembic revision --autogenerate -m "init"
alembic upgrade head
```

- [ ] **Step 9: Commit**

```bash
git add smartdiet-backend/app/models/ smartdiet-backend/alembic/
git commit -m "feat: add SQLAlchemy models and Alembic migration"
```

---

### Task 3: Pydantic Schemas

**Files:**
- Create: `smartdiet-backend/app/schemas/__init__.py`
- Create: `smartdiet-backend/app/schemas/user.py`
- Create: `smartdiet-backend/app/schemas/food.py`
- Create: `smartdiet-backend/app/schemas/chat.py`
- Create: `smartdiet-backend/app/schemas/report.py`

- [ ] **Step 1: Write schemas/user.py**

```python
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    openid: str
    nickname: str = ""
    avatar: str = ""
    gender: int = 0
    age: int = 25
    height: Decimal = Decimal("170")
    weight: Decimal = Decimal("65")
    activity_level: int = 3
    goal: str = "maintain"


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    gender: Optional[int] = None
    age: Optional[int] = None
    height: Optional[Decimal] = None
    weight: Optional[Decimal] = None
    activity_level: Optional[int] = None
    goal: Optional[str] = None
    preferences: Optional[list] = None
    allergies: Optional[list] = None


class UserResponse(BaseModel):
    id: UUID
    openid: str
    nickname: str
    avatar: str
    gender: int
    age: int
    height: Decimal
    weight: Decimal
    activity_level: int
    goal: str
    preferences: list
    allergies: list
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    code: str


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    is_new: bool
```

- [ ] **Step 2: Write schemas/food.py**

```python
from datetime import datetime, date
from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class FoodItem(BaseModel):
    name: str
    category: str = ""
    score: int = 60
    weight: float = 100
    confidence: float = 0.8
    tags: dict = {}
    tag_reasons: dict = {}
    advice: str = ""


class MealOverview(BaseModel):
    overall_health_score: int = 60
    health_tags: dict = {}
    tag_reasons: dict = {}
    summary: str = ""


class FoodRecordCreate(BaseModel):
    date: date
    meal_type: str
    foods: list[FoodItem] = []
    meal_overview: MealOverview = MealOverview()
    image_url: str = ""


class FoodRecordUpdate(BaseModel):
    meal_type: Optional[str] = None
    foods: Optional[list[FoodItem]] = None
    meal_overview: Optional[MealOverview] = None


class FoodRecordResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    meal_type: str
    foods: list[FoodItem]
    meal_overview: MealOverview
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class FoodRecognitionRequest(BaseModel):
    image_url: str
    user_feedback: str = ""


class FoodRecognitionResponse(BaseModel):
    foods: list[FoodItem]
    meal_overview: MealOverview
    dietary_advice: str = ""
```

- [ ] **Step 3: Write schemas/chat.py**

```python
from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class MessageCreate(BaseModel):
    conversation_id: Optional[UUID] = None
    content: str = ""
    image_url: str = ""


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: Write schemas/report.py**

```python
from datetime import date
from pydantic import BaseModel


class WeeklyReportResponse(BaseModel):
    week_start: date
    week_end: date
    total_meals: int
    avg_score: float
    score_trend: list
    report: str = ""
```

- [ ] **Step 5: Write schemas/__init__.py**

```python
from app.schemas.user import UserCreate, UserUpdate, UserResponse, LoginRequest, LoginResponse
from app.schemas.food import FoodItem, MealOverview, FoodRecordCreate, FoodRecordUpdate, FoodRecordResponse, FoodRecognitionRequest, FoodRecognitionResponse
from app.schemas.chat import MessageCreate, MessageResponse, ConversationResponse
from app.schemas.report import WeeklyReportResponse

__all__ = [
    "UserCreate", "UserUpdate", "UserResponse", "LoginRequest", "LoginResponse",
    "FoodItem", "MealOverview", "FoodRecordCreate", "FoodRecordUpdate", "FoodRecordResponse",
    "FoodRecognitionRequest", "FoodRecognitionResponse",
    "MessageCreate", "MessageResponse", "ConversationResponse",
    "WeeklyReportResponse",
]
```

- [ ] **Step 6: Commit**

```bash
git add smartdiet-backend/app/schemas/
git commit -m "feat: add Pydantic schemas for all API models"
```

---

### Task 4: Error Handling + Dependencies

**Files:**
- Create: `smartdiet-backend/app/core/exceptions.py`
- Create: `smartdiet-backend/app/core/dependencies.py`

- [ ] **Step 1: Write core/exceptions.py**

```python
from fastapi import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED, HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR


class AppException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        self.code = code
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


class BadRequest(AppException):
    def __init__(self, message: str = "参数错误"):
        super().__init__(HTTP_400_BAD_REQUEST, "BAD_REQUEST", message)


class Unauthorized(AppException):
    def __init__(self, message: str = "未授权"):
        super().__init__(HTTP_401_UNAUTHORIZED, "UNAUTHORIZED", message)


class NotFound(AppException):
    def __init__(self, message: str = "资源不存在"):
        super().__init__(HTTP_404_NOT_FOUND, "NOT_FOUND", message)


class InternalError(AppException):
    def __init__(self, message: str = "服务器内部错误"):
        super().__init__(HTTP_500_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message)
```

- [ ] **Step 2: Write core/dependencies.py**

```python
from uuid import UUID
from fastapi import Depends, Header
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import Unauthorized, NotFound
from app.models.user import User


async def get_current_user(
    authorization: str = Header(..., description="Bearer token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise Unauthorized("无效的认证头")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise Unauthorized("无效的令牌")
    except JWTError:
        raise Unauthorized("令牌已过期或无效")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFound("用户不存在")
    return user
```

- [ ] **Step 3: Add exception handler to main.py**

Update `app/main.py`:

```python
from app.core.exceptions import AppException

# Add after app = FastAPI(...)

@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "message": exc.detail["message"]},
    )
```

- [ ] **Step 4: Commit**

```bash
git add smartdiet-backend/app/core/exceptions.py smartdiet-backend/app/core/dependencies.py smartdiet-backend/app/main.py
git commit -m "feat: add error handling, JWT auth dependency, and exception handler"
```

---

### Task 5: User Service + API

**Files:**
- Create: `smartdiet-backend/app/services/__init__.py`
- Create: `smartdiet-backend/app/services/user.py`
- Create: `smartdiet-backend/app/api/__init__.py`
- Create: `smartdiet-backend/app/api/v1/__init__.py`
- Create: `smartdiet-backend/app/api/v1/user.py`

- [ ] **Step 1: Write services/user.py**

```python
from uuid import UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.core.config import settings
from app.core.exceptions import BadRequest
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def _create_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def login(db: AsyncSession, code: str) -> tuple[User, str, bool]:
    if not code:
        raise BadRequest("登录 code 不能为空")
    # local dev: mock openid from code
    openid = f"mock_{code}" if code != "mock" else "mock_openid"

    result = await db.execute(select(User).where(User.openid == openid))
    user = result.scalar_one_or_none()

    if user:
        token = _create_token(user.id)
        return user, token, False

    user = User(openid=openid)
    db.add(user)
    await db.flush()
    token = _create_token(user.id)
    return user, token, True


async def get_user(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user_id: UUID, data: UserUpdate) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise BadRequest("用户不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    return user
```

- [ ] **Step 2: Write api/v1/user.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserResponse, UserUpdate
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, token, is_new = await user_service.login(db, req.code)
    return LoginResponse(token=token, user=UserResponse.model_validate(user), is_new=is_new)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.update_user(db, current_user.id, data)
    return UserResponse.model_validate(user)
```

- [ ] **Step 3: Register router in app/main.py**

```python
from app.api.v1.user import router as user_router

# Add after lifespan definition
app.include_router(user_router, prefix="/api/v1")
```

- [ ] **Step 4: Write test for user API**

```python
# tests/test_user_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_login(client):
    resp = await client.post("/api/v1/users/login", json={"code": "test123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "user" in data


@pytest.mark.asyncio
async def test_get_me(client):
    login_resp = await client.post("/api/v1/users/login", json={"code": "test456"})
    token = login_resp.json()["token"]
    resp = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_user_api.py -v
```
Expected: PASS (or skip if no DB — tests may need DB running)

- [ ] **Step 6: Commit**

```bash
git add smartdiet-backend/app/services/ smartdiet-backend/app/api/ tests/
git commit -m "feat: add user login, profile API, and JWT auth"
```

---

### Task 6: Food Record Service + API

**Files:**
- Create: `smartdiet-backend/app/services/food.py`
- Create: `smartdiet-backend/app/api/v1/food.py`

- [ ] **Step 1: Write services/food.py**

```python
from uuid import UUID
from datetime import date, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.food_record import FoodRecord
from app.schemas.food import FoodRecordCreate, FoodRecordUpdate
from app.schemas.report import WeeklyReportResponse


async def create_record(db: AsyncSession, user_id: UUID, data: FoodRecordCreate) -> FoodRecord:
    record = FoodRecord(
        user_id=user_id,
        date=data.date,
        meal_type=data.meal_type,
        foods=[f.model_dump() for f in data.foods],
        meal_overview=data.meal_overview.model_dump(),
        image_url=data.image_url,
    )
    db.add(record)
    await db.flush()
    return record


async def get_records_by_date(db: AsyncSession, user_id: UUID, query_date: date) -> list[FoodRecord]:
    result = await db.execute(
        select(FoodRecord)
        .where(and_(FoodRecord.user_id == user_id, FoodRecord.date == query_date))
        .order_by(FoodRecord.created_at.desc())
    )
    return list(result.scalars().all())


async def get_history(db: AsyncSession, user_id: UUID, start: date, end: date) -> list[FoodRecord]:
    result = await db.execute(
        select(FoodRecord)
        .where(and_(FoodRecord.user_id == user_id, FoodRecord.date >= start, FoodRecord.date <= end))
        .order_by(FoodRecord.date.desc(), FoodRecord.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().all())


async def delete_record(db: AsyncSession, user_id: UUID, record_id: UUID) -> None:
    result = await db.execute(
        select(FoodRecord).where(and_(FoodRecord.id == record_id, FoodRecord.user_id == user_id))
    )
    record = result.scalar_one_or_none()
    if not record:
        raise NotFound("记录不存在")
    await db.delete(record)
    await db.flush()


async def update_record(db: AsyncSession, user_id: UUID, record_id: UUID, data: FoodRecordUpdate) -> FoodRecord:
    result = await db.execute(
        select(FoodRecord).where(and_(FoodRecord.id == record_id, FoodRecord.user_id == user_id))
    )
    record = result.scalar_one_or_none()
    if not record:
        raise NotFound("记录不存在")
    update_data = data.model_dump(exclude_unset=True)
    if "foods" in update_data:
        update_data["foods"] = [f.model_dump() for f in data.foods]
    if "meal_overview" in update_data:
        update_data["meal_overview"] = data.meal_overview.model_dump()
    for field, value in update_data.items():
        setattr(record, field, value)
    await db.flush()
    return record


async def get_weekly_report(db: AsyncSession, user_id: UUID) -> WeeklyReportResponse:
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    records = await get_history(db, user_id, week_start, week_end)

    scores = []
    for r in records:
        overview = r.meal_overview or {}
        score = overview.get("overall_health_score", 60)
        scores.append(score)

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    score_trend = [{"date": str(r.date), "score": (r.meal_overview or {}).get("overall_health_score", 60)} for r in records]

    return WeeklyReportResponse(
        week_start=week_start,
        week_end=week_end,
        total_meals=len(records),
        avg_score=avg_score,
        score_trend=score_trend,
        report=f"本周共记录 {len(records)} 餐，平均健康分 {avg_score}",
    )
```

- [ ] **Step 2: Write api/v1/food.py**

```python
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.food import FoodRecordCreate, FoodRecordUpdate, FoodRecordResponse
from app.schemas.report import WeeklyReportResponse
from app.services import food as food_service

router = APIRouter(prefix="/records", tags=["food_records"])


@router.post("", response_model=FoodRecordResponse, status_code=201)
async def create_record(data: FoodRecordCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    record = await food_service.create_record(db, current_user.id, data)
    return FoodRecordResponse.model_validate(record)


@router.get("", response_model=list[FoodRecordResponse])
async def get_records(date: date = Query(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    records = await food_service.get_records_by_date(db, current_user.id, date)
    return [FoodRecordResponse.model_validate(r) for r in records]


@router.get("/history", response_model=list[FoodRecordResponse])
async def get_history(start: date = Query(...), end: date = Query(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    records = await food_service.get_history(db, current_user.id, start, end)
    return [FoodRecordResponse.model_validate(r) for r in records]


@router.delete("/{record_id}", status_code=204)
async def delete_record(record_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await food_service.delete_record(db, current_user.id, record_id)


@router.patch("/{record_id}", response_model=FoodRecordResponse)
async def update_record(record_id: UUID, data: FoodRecordUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    record = await food_service.update_record(db, current_user.id, record_id, data)
    return FoodRecordResponse.model_validate(record)


@router.get("/report/weekly", response_model=WeeklyReportResponse)
async def weekly_report(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await food_service.get_weekly_report(db, current_user.id)
```

- [ ] **Step 3: Register in main.py**

```python
from app.api.v1.food import router as food_router
app.include_router(food_router, prefix="/api/v1")
```

- [ ] **Step 4: Commit**

```bash
git add smartdiet-backend/app/services/food.py smartdiet-backend/app/api/v1/food.py smartdiet-backend/app/main.py
git commit -m "feat: add food record CRUD API and weekly report"
```

---

### Task 7: Conversation + Message Service and API

**Files:**
- Create: `smartdiet-backend/app/services/chat.py`
- Create: `smartdiet-backend/app/api/v1/chat.py`

- [ ] **Step 1: Write services/chat.py**

```python
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import MessageCreate


async def create_conversation(db: AsyncSession, user_id: UUID) -> Conversation:
    conv = Conversation(user_id=user_id)
    db.add(conv)
    await db.flush()
    return conv


async def list_conversations(db: AsyncSession, user_id: UUID) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_conversation(db: AsyncSession, user_id: UUID, conv_id: UUID) -> Conversation:
    result = await db.execute(
        select(Conversation).where(and_(Conversation.id == conv_id, Conversation.user_id == user_id))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise NotFound("对话不存在")
    return conv


async def delete_conversation(db: AsyncSession, user_id: UUID, conv_id: UUID) -> None:
    conv = await get_conversation(db, user_id, conv_id)
    await db.delete(conv)
    await db.flush()


async def add_message(db: AsyncSession, conv_id: UUID, role: str, content: str, metadata: dict = None) -> Message:
    msg = Message(conversation_id=conv_id, role=role, content=content, metadata_=metadata or {})
    db.add(msg)
    await db.flush()
    return msg


async def get_history(db: AsyncSession, conv_id: UUID, limit: int = 50) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())
```

- [ ] **Step 2: Write api/v1/chat.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import MessageCreate, MessageResponse, ConversationResponse
from app.services import chat as chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    conv = await chat_service.create_conversation(db, current_user.id)
    return ConversationResponse.model_validate(conv)


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    convs = await chat_service.list_conversations(db, current_user.id)
    return [ConversationResponse.model_validate(c) for c in convs]


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageResponse])
async def get_history(conv_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await chat_service.get_conversation(db, current_user.id, conv_id)
    messages = await chat_service.get_history(db, conv_id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.delete("/conversations/{conv_id}", status_code=204)
async def delete_conversation(conv_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await chat_service.delete_conversation(db, current_user.id, conv_id)
```

- [ ] **Step 3: Register in main.py**

```python
from app.api.v1.chat import router as chat_router
app.include_router(chat_router, prefix="/api/v1")
```

- [ ] **Step 4: Commit**

```bash
git add smartdiet-backend/app/services/chat.py smartdiet-backend/app/api/v1/chat.py smartdiet-backend/app/main.py
git commit -m "feat: add conversation and message CRUD API"
```

---

### Task 8: AI Service Layer (LangChain)

**Files:**
- Create: `smartdiet-backend/app/services/ai.py`

- [ ] **Step 1: Write services/ai.py**

```python
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_community.chat_models import ChatZhipuAI
from langchain_community.chat_models.tongyi import ChatTongyi

from app.core.config import settings


def get_llm(model_type: str = None) -> BaseChatModel:
    provider = model_type or settings.llm_provider
    if provider == "zhipu":
        return ChatZhipuAI(
            api_key=settings.zhipu_api_key,
            model=settings.zhipu_model,
            temperature=0.7,
        )
    return ChatTongyi(
        api_key=settings.dashscope_api_key,
        model=settings.dashscope_model,
        temperature=0.7,
    )


def get_vision_llm(model_type: str = None) -> BaseChatModel:
    provider = model_type or settings.llm_provider
    if provider == "zhipu":
        return ChatZhipuAI(
            api_key=settings.zhipu_api_key,
            model=settings.zhipu_model,
            temperature=0.3,
        )
    return ChatTongyi(
        api_key=settings.dashscope_api_key,
        model="qwen-vl-plus",
        temperature=0.3,
    )
```

- [ ] **Step 2: Write test for AI service**

```python
# tests/test_ai_service.py
from app.services.ai import get_llm, get_vision_llm


def test_get_llm_returns_chat_model():
    llm = get_llm("dashscope")
    assert llm is not None


def test_get_vision_llm_returns_chat_model():
    llm = get_vision_llm("dashscope")
    assert llm is not None
```

- [ ] **Step 3: Commit**

```bash
git add smartdiet-backend/app/services/ai.py tests/test_ai_service.py
git commit -m "feat: add LangChain LLM service with Qwen/GLM providers"
```

---

### Task 9: Food Recognition Workflow (LangGraph)

**Files:**
- Create: `smartdiet-backend/app/workflows/__init__.py`
- Create: `smartdiet-backend/app/workflows/food_recognition.py`

- [ ] **Step 1: Write workflows/food_recognition.py**

```python
import json
from typing import TypedDict, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from app.services.ai import get_vision_llm
from app.schemas.food import FoodItem, MealOverview


class FoodRecognitionState(TypedDict):
    image_url: str
    user_id: str
    user_profile: Optional[dict]
    raw_response: Optional[str]
    foods: list[FoodItem]
    meal_overview: MealOverview
    dietary_advice: str
    error: Optional[str]


FOOD_RECOGNITION_PROMPT = """### 角色
AI 营养师。分析图像，结合用户信息 ({user_profile}) 输出 JSON。
必须严格遵循下方 JSON 结构，无 Markdown 标记。

### JSON 结构示例
{{
   "success": true,
   "summary": {{
     "score": 65,
     "tags": {{"good": ["高蛋白"], "warn": ["高钠"]}},
     "tagReasons": {{"高蛋白": "鸡肉富含优质蛋白质", "高钠": "酱油和腌制调料含盐量高"}}
   }},
   "items": [
     {{
       "id": "food_001",
       "name": "宫保鸡丁",
       "category": "种类",
       "score": 75,
       "weight": {{"val": 135, "conf": 0.85}},
       "tags": {{"good": ["高蛋白"], "warn": ["高钠"]}},
       "tagReasons": {{"高蛋白": "鸡肉富含优质蛋白质", "高钠": "酱油和腌制调料含盐量高"}},
       "advice": "简短建议"
     }}
   ]
}}
错误返回：{{"success": false, "message": "原因"}}"""


async def recognize_food(state: FoodRecognitionState) -> FoodRecognitionState:
    llm = get_vision_llm()
    prompt = FOOD_RECOGNITION_PROMPT.replace("{user_profile}", json.dumps(state.get("user_profile", {}), ensure_ascii=False))
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=[{"type": "image_url", "image_url": {"url": state["image_url"]}}]),
    ]
    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()
        result = json.loads(content)
        if not result.get("success"):
            return {**state, "error": result.get("message", "识别失败")}

        foods = []
        for item in result.get("items", []):
            foods.append(FoodItem(
                name=item.get("name", "未知食物"),
                category=item.get("category", ""),
                score=item.get("score", 60),
                weight=item.get("weight", {}).get("val", 100),
                confidence=item.get("weight", {}).get("conf", 0.8),
                tags={"positive": item.get("tags", {}).get("good", []), "warning": item.get("tags", {}).get("warn", [])},
                tag_reasons=item.get("tagReasons", {}),
                advice=item.get("advice", ""),
            ))

        summary = result.get("summary", {})
        overview = MealOverview(
            overall_health_score=summary.get("score", 60),
            health_tags={"positive": summary.get("tags", {}).get("good", []), "warning": summary.get("tags", {}).get("warn", [])},
            tag_reasons=summary.get("tagReasons", {}),
            summary=f"识别到: {', '.join(f.name for f in foods)}" if foods else "识别成功",
        )

        advices = [f.advice for f in foods if f.advice]
        dietary_advice = "; ".join(advices)

        return {**state, "foods": foods, "meal_overview": overview, "dietary_advice": dietary_advice}
    except Exception as e:
        return {**state, "error": str(e)}


def build_food_recognition_graph() -> StateGraph:
    builder = StateGraph(FoodRecognitionState)
    builder.add_node("recognize_food", recognize_food)
    builder.add_edge(START, "recognize_food")
    builder.add_edge("recognize_food", END)
    return builder.compile()
```

- [ ] **Step 2: Write test for workflow**

```python
# tests/test_workflow_food.py
import pytest
from app.workflows.food_recognition import build_food_recognition_graph


@pytest.mark.asyncio
async def test_food_recognition_graph_structure():
    graph = build_food_recognition_graph()
    assert graph is not None
```

- [ ] **Step 3: Commit**

```bash
git add smartdiet-backend/app/workflows/ tests/test_workflow_food.py
git commit -m "feat: add LangGraph food recognition workflow"
```

---

### Task 10: Chat Workflow (LangGraph with Intent Classification)

**Files:**
- Create: `smartdiet-backend/app/workflows/chat.py`

- [ ] **Step 1: Write workflows/chat.py**

```python
import json
from typing import TypedDict, Optional, Literal
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from app.services.ai import get_llm


class ChatState(TypedDict):
    message: str
    user_profile: Optional[dict]
    recent_diet: Optional[dict]
    history: list[dict]
    intent: Optional[str]
    reply: Optional[str]


INTENT_CLASSIFIER_PROMPT = """分析用户消息的意图，只返回以下其一：
- advice: 用户询问饮食建议、营养咨询
- query: 用户想查询饮食记录
- chat: 普通闲聊
- image: 用户想识别食物图片

消息: {message}
意图:"""

CHAT_PROMPT = """你是 AI 营养师助手。帮助用户记录饮食、提供建议、解答问题。

用户信息：{user_profile}
最近饮食：{recent_diet}

用温暖专业的语气回复，简洁明了。"""


async def classify_intent(state: ChatState) -> Command[Literal["handle_advice", "handle_query", "handle_chat", "handle_image"]]:
    llm = get_llm()
    prompt = INTENT_CLASSIFIER_PROMPT.format(message=state["message"])
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    intent = response.content.strip().lower()
    intent = intent if intent in ("advice", "query", "chat", "image") else "chat"
    state["intent"] = intent
    goto_map = {
        "advice": "handle_advice",
        "query": "handle_query",
        "chat": "handle_chat",
        "image": "handle_image",
    }
    return Command(goto=goto_map[intent], update={"intent": intent})


async def handle_chat(state: ChatState) -> ChatState:
    llm = get_llm()
    prompt = CHAT_PROMPT.format(
        user_profile=json.dumps(state.get("user_profile", {}), ensure_ascii=False),
        recent_diet=json.dumps(state.get("recent_diet", {}), ensure_ascii=False),
    )
    messages = [SystemMessage(content=prompt)]
    for msg in (state.get("history") or []):
        messages.append(HumanMessage(content=msg.get("content", "")) if msg.get("role") == "user" else SystemMessage(content=msg.get("content", "")))
    messages.append(HumanMessage(content=state["message"]))
    response = await llm.ainvoke(messages)
    return {**state, "reply": response.content}


async def handle_advice(state: ChatState) -> ChatState:
    return await handle_chat(state)


async def handle_query(state: ChatState) -> ChatState:
    return {**state, "reply": "请通过报告页面查看饮食记录"}


async def handle_image(state: ChatState) -> ChatState:
    return {**state, "reply": "请拍照上传以识别食物"}, state


def build_chat_graph() -> StateGraph:
    builder = StateGraph(ChatState)
    builder.add_node("classify_intent", classify_intent)
    builder.add_node("handle_advice", handle_advice)
    builder.add_node("handle_query", handle_query)
    builder.add_node("handle_chat", handle_chat)
    builder.add_node("handle_image", handle_image)
    builder.add_edge(START, "classify_intent")
    builder.add_edge("handle_advice", END)
    builder.add_edge("handle_query", END)
    builder.add_edge("handle_chat", END)
    builder.add_edge("handle_image", END)
    return builder.compile()
```

- [ ] **Step 2: Commit**

```bash
git add smartdiet-backend/app/workflows/chat.py
git commit -m "feat: add LangGraph chat workflow with intent classification"
```

---

### Task 11: Connect AI Workflows to API

**Files:**
- Modify: `smartdiet-backend/app/services/food.py` (add recognition)
- Modify: `smartdiet-backend/app/services/chat.py` (add AI reply)
- Modify: `smartdiet-backend/app/api/v1/food.py` (add recognition endpoint)
- Modify: `smartdiet-backend/app/api/v1/chat.py` (add message endpoint with AI)

- [ ] **Step 1: Add image recognition to api/v1/food.py**

```python
from app.core.exceptions import BadRequest
from app.schemas.food import FoodRecognitionRequest, FoodRecognitionResponse
from app.workflows.food_recognition import build_food_recognition_graph, FoodRecognitionState


@router.post("/recognize", response_model=FoodRecognitionResponse)
async def recognize_food(
    req: FoodRecognitionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    graph = build_food_recognition_graph()
    initial_state: FoodRecognitionState = {
        "image_url": req.image_url,
        "user_id": str(current_user.id),
        "user_profile": {"age": current_user.age, "weight": float(current_user.weight), "goal": current_user.goal},
        "raw_response": None,
        "foods": [],
        "meal_overview": None,
        "dietary_advice": "",
        "error": None,
    }
    result = await graph.ainvoke(initial_state)
    if result.get("error"):
        raise BadRequest(result["error"])
    return FoodRecognitionResponse(
        foods=result["foods"],
        meal_overview=result["meal_overview"],
        dietary_advice=result["dietary_advice"],
    )
```

- [ ] **Step 2: Add AI reply to POST /chat/messages endpoint**

In `api/v1/chat.py`:

```python
from app.services import chat as chat_service
from app.workflows.chat import build_chat_graph, ChatState
from app.schemas.chat import MessageCreate, MessageResponse


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # create conversation if not exists
    conv_id = req.conversation_id
    if not conv_id:
        conv = await chat_service.create_conversation(db, current_user.id)
        conv_id = conv.id
    else:
        await chat_service.get_conversation(db, current_user.id, conv_id)

    # save user message
    await chat_service.add_message(db, conv_id, "user", req.content)

    # load history
    history_messages = await chat_service.get_history(db, conv_id, 20)
    history = [{"role": m.role, "content": m.content} for m in history_messages[-10:]]

    # run chat workflow
    graph = build_chat_graph()
    state: ChatState = {
        "message": req.content,
        "user_profile": {"age": current_user.age, "weight": float(current_user.weight), "goal": current_user.goal},
        "recent_diet": {},
        "history": history,
        "intent": None,
        "reply": None,
    }
    result = await graph.ainvoke(state)
    reply = result.get("reply", "抱歉，暂时无法回复")

    # save AI reply
    msg = await chat_service.add_message(db, conv_id, "assistant", reply, {"intent": result.get("intent")})
    return MessageResponse.model_validate(msg)
```

- [ ] **Step 3: Commit**

```bash
git add smartdiet-backend/app/api/v1/food.py smartdiet-backend/app/api/v1/chat.py
git commit -m "feat: wire AI workflows to API endpoints"
```

---

### Task 12: Test Infrastructure + Integration Tests

**Files:**
- Modify: `smartdiet-backend/tests/conftest.py`
- Modify: `smartdiet-backend/tests/test_user_api.py`
- Create: `smartdiet-backend/tests/test_food_api.py`
- Create: `smartdiet-backend/tests/test_chat_api.py`
- Create: `smartdiet-backend/tests/test_workflow_chat.py`

- [ ] **Step 1: Write tests/conftest.py with proper fixtures**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db


@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_client(client, db_session):
    resp = await client.post("/api/v1/users/login", json={"code": "mock"})
    token = resp.json()["token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client
```

- [ ] **Step 2: Write test_food_api.py**

```python
import pytest
from datetime import date


@pytest.mark.asyncio
async def test_create_food_record(auth_client):
    resp = await auth_client.post("/api/v1/records", json={
        "date": str(date.today()),
        "meal_type": "lunch",
        "foods": [{"name": "测试食物", "score": 80}],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["date"] == str(date.today())
    assert data["meal_type"] == "lunch"


@pytest.mark.asyncio
async def test_get_records_by_date(auth_client):
    resp = await auth_client.get(f"/api/v1/records?date={date.today()}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
```

- [ ] **Step 3: Run tests**

```bash
pytest tests/ -v
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add smartdiet-backend/tests/
git commit -m "test: add integration tests and conftest with DB fixtures"
```

---

### Task 13: Final Cleanup and Verify

- [ ] **Step 1: Verify docker compose works**

```bash
cd smartdiet-backend
docker compose up -d
docker compose logs app
```
Expected: uvicorn running on port 8000

- [ ] **Step 2: Test health endpoint**

```bash
curl http://localhost:8000/health
```
Expected: `{"status": "ok"}`

- [ ] **Step 3: Run full test suite**

```bash
pytest tests/ -v --cov=app
```
Expected: All tests pass

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "chore: cleanup and finalize backend scaffold"
```
