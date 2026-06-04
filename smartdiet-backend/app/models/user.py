import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, SmallInteger, Numeric, DateTime
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import UUID

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
    preferences = Column(JSON, default=list)
    allergies = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
