from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class MessageCreate(BaseModel):
    conversation_id: Optional[UUID] = None
    content: str = ""
    image_url: str = ""


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
