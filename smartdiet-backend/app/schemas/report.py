from datetime import date
from pydantic import BaseModel

from app.schemas.base import CamelModel


class WeeklyReportResponse(CamelModel):
    week_start: date
    week_end: date
    total_meals: int
    avg_score: float
    score_trend: list
    report: str = ""
