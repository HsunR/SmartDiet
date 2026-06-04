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
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
    date: date
    meal_type: str
    foods: list[FoodItem]
    meal_overview: MealOverview
    image_url: str
    created_at: datetime


class FoodRecognitionRequest(BaseModel):
    image_url: str
    user_feedback: str = ""


class FoodRecognitionResponse(BaseModel):
    foods: list[FoodItem]
    meal_overview: MealOverview
    dietary_advice: str = ""
