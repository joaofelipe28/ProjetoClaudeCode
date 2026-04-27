import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DeckCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class DeckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    created_at: datetime.datetime
    card_count: int = 0
    due_count: int = 0      # scheduled due + new cards
    new_count: int = 0      # cards never reviewed
    retention_pct: Optional[float] = None   # % reviews with rating >= 3 (last 30d)


class FlashcardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    deck_id: int
    front: str
    back: str
    tags: Optional[List[str]] = None
    created_at: datetime.datetime
    next_review_date: Optional[datetime.date] = None


class ReviewRequest(BaseModel):
    rating: int = Field(..., ge=0, le=5)


class ReviewResult(BaseModel):
    card_id: int
    next_review_date: datetime.date
    interval_days: int
    ease_factor: float
    repetitions: int


class ImportResult(BaseModel):
    added: int
    skipped: int


class FlashcardMetrics(BaseModel):
    total_cards: int
    due_today: int      # scheduled due + new cards
    new_cards: int
    reviews_today: int
    retention_30d: Optional[float]  # percentage
