import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Integer
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class FoodRecord(Base):
    __tablename__ = "food_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    meal_type = Column(String(16), nullable=False)
    foods = Column(JSON, default=list)
    meal_overview = Column(JSON, default=dict)
    image_url = Column(String(512), default="")
    rating = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
