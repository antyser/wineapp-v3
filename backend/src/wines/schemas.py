from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from src.models import DBBaseModel


class WineBase(BaseModel):
    """Base fields for a wine"""

    name: str
    winery: Optional[str] = None
    vintage: Optional[int] = None
    region: Optional[str] = None
    country: Optional[str] = None
    varietal: Optional[str] = None
    type: Optional[str] = None  # red, white, sparkling, etc.
    price: Optional[float] = None
    rating: Optional[int] = None
    wine_searcher_url: Optional[str] = None
    average_price: Optional[float] = None
    description: Optional[str] = None
    name_alias: Optional[List[str]] = None
    image_url: Optional[str] = None
    wine_searcher_id: Optional[str] = None

    # ==== from AI generated data ====
    drinking_window: Optional[str] = None
    food_pairings: Optional[str] = None
    abv: Optional[str] = None
    tasting_notes: Optional[str] = None
    winemaker_notes: Optional[str] = None
    professional_reviews: Optional[str] = None


class WineCreate(WineBase):
    """Fields required to create a wine"""

    pass


class WineUpdate(BaseModel):
    """Fields that can be updated"""

    name: Optional[str] = None
    winery: Optional[str] = None
    vintage: Optional[int] = None
    region: Optional[str] = None
    country: Optional[str] = None
    varietal: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    rating: Optional[int] = None
    tasting_notes: Optional[str] = None
    image_url: Optional[str] = None
    wine_searcher_id: Optional[str] = None
    wine_searcher_url: Optional[str] = None
    average_price: Optional[float] = None
    description: Optional[str] = None
    drinking_window: Optional[str] = None
    food_pairings: Optional[str] = None
    abv: Optional[str] = None
    name_alias: Optional[List[str]] = None
    winemaker_notes: Optional[str] = None
    professional_reviews: Optional[str] = None


class Wine(WineBase, DBBaseModel):
    """Full wine model with all fields"""

    id: UUID
    created_at: datetime
    updated_at: datetime


class WineSearchParams(BaseModel):
    """Parameters for searching wines"""

    query: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    varietal: Optional[str] = None
    type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[int] = None
    min_vintage: Optional[int] = None
    max_vintage: Optional[int] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class WineSearchResults(BaseModel):
    """Results from a wine search"""

    items: List[Wine]
    total: int


class Interaction(BaseModel):
    id: Optional[UUID] = None
    user_id: UUID
    wine_id: UUID
    liked: Optional[bool] = None
    wishlist: Optional[bool] = None
    rating: Optional[float] = None
    tasted: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Note(BaseModel):
    id: UUID
    user_id: UUID
    wine_id: UUID
    cellar_wine_id: Optional[UUID] = None
    tasting_date: Optional[datetime] = None
    note_text: str
    rating_5: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class SearchHistory(BaseModel):
    id: UUID
    user_id: UUID
    search_type: str
    query: Optional[str] = None
    file_url: Optional[str] = None
    result_wine_ids: Optional[List[str]] = None
    created_at: datetime


class UserWineResponse(BaseModel):
    """Response model for the user's comprehensive wine information"""

    wine: Optional[Wine] = None
    interaction: Optional[Interaction] = None
    notes: List[Note] = Field(default_factory=list)
    cellar_wines: List[dict] = Field(default_factory=list)
