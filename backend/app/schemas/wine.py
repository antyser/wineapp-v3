from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class WineBase(BaseModel):
    name: str
    vintage: int
    region: str
    country: str
    description: Optional[str] = None
    grapes: Optional[List[str]] = None
    alcohol_content: Optional[float] = None
    price: Optional[float] = None


class WineCreate(WineBase):
    pass


class Wine(WineBase):
    id: str
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WineCellarEntryBase(BaseModel):
    wine_id: str
    quantity: int = Field(gt=0)
    purchase_price: Optional[float] = None
    purchase_date: Optional[datetime] = None
    drink_by_date: Optional[datetime] = None
    notes: Optional[str] = None


class WineCellarEntryCreate(WineCellarEntryBase):
    pass


class WineCellarEntry(WineCellarEntryBase):
    id: str
    user_id: str
    cellar_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TastingNoteBase(BaseModel):
    wine_id: str
    rating: float = Field(ge=0, le=5)
    appearance: Optional[str] = None
    nose: Optional[str] = None
    palate: Optional[str] = None
    finish: Optional[str] = None
    overall_notes: Optional[str] = None
    tasting_date: datetime = Field(default_factory=datetime.now)


class TastingNoteCreate(TastingNoteBase):
    pass


class TastingNote(TastingNoteBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
