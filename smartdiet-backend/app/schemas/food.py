from datetime import datetime, date
from uuid import UUID
from typing import Optional
from pydantic import BaseModel

from app.schemas.base import CamelModel


class FoodItem(CamelModel):
    name: str
    category: str = ""
    score: int = 60
    weight: float = 100
    confidence: float = 0.8
    tags: dict = {}
    tag_reasons: dict = {}
    advice: str = ""


class MealOverview(CamelModel):
    overall_health_score: int = 60
    health_tags: dict = {}
    tag_reasons: dict = {}
    summary: str = ""


class FoodRecordCreate(CamelModel):
    date: date
    meal_type: str
    foods: list[FoodItem] = []
    meal_overview: MealOverview = MealOverview()
    image_url: str = ""


class FoodRecordUpdate(CamelModel):
    meal_type: Optional[str] = None
    foods: Optional[list[FoodItem]] = None
    meal_overview: Optional[MealOverview] = None


class FoodRecordResponse(CamelModel):
    id: UUID
    user_id: UUID
    date: date
    meal_type: str
    foods: list[FoodItem]
    meal_overview: MealOverview
    image_url: str
    created_at: datetime


class FoodRecognitionRequest(CamelModel):
    image_url: str
    user_feedback: str = ""


class FoodRecognitionResponse(CamelModel):
    foods: list[FoodItem]
    meal_overview: MealOverview
    dietary_advice: str = ""
