from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel

from app.schemas.base import CamelModel


class MessageCreate(CamelModel):
    conversation_id: Optional[UUID] = None
    content: str = ""
    image_url: str = ""


class MessageResponse(CamelModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime


class ConversationResponse(CamelModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
