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
    model_config = {"from_attributes": True}

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


class LoginRequest(BaseModel):
    code: str


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    is_new: bool
