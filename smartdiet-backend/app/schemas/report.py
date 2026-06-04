from datetime import date
from pydantic import BaseModel


class WeeklyReportResponse(BaseModel):
    week_start: date
    week_end: date
    total_meals: int
    avg_score: float
    score_trend: list
    report: str = ""
