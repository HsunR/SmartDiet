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
