from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_serializer

from src.cellar.schemas import CellarWine
from src.interactions.schemas import Interaction
from src.models import DBBaseModel
from src.notes.schemas import Note


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


class MyWinesSearchParams(BaseModel):
    query: Optional[str] = Field(
        None, description="General text search across name, winery, region, varietal"
    )
    wine_type: Optional[str] = Field(
        None, description="Filter by wine type (e.g., red, white)"
    )
    country: Optional[str] = Field(None, description="Filter by country of origin")
    grape_variety: Optional[str] = Field(None, description="Filter by grape variety")
    region: Optional[str] = Field(None, description="Filter by region")
    winery: Optional[str] = Field(None, description="Filter by winery/producer")
    # Add other relevant filters if needed, e.g., vintage range

    sort_by: Optional[str] = Field(
        "name",
        description="Field to sort by (e.g., name, vintage, rating, created_at)",
    )
    sort_order: str = Field(
        "asc", description="Sort order: 'asc' or 'desc'", pattern="^(asc|desc)$"
    )

    limit: int = Field(20, ge=1, le=100, description="Number of items per page")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class PaginatedWineResponse(BaseModel):
    items: List[Wine]
    total: int


class UserWineResponse(BaseModel):
    """Response model for the user's comprehensive wine information"""

    wine: Optional[Wine] = None
    interaction: Optional[Interaction] = None
    notes: List[Note] = Field(default_factory=list)
    cellar_wines: Optional[List[CellarWine]] = []


# Schema for enriched user wine data (combines wine with user interaction data)
class EnrichedUserWine(Wine):
    """Wine data enriched with user interaction information"""

    # Interaction data
    wishlist: Optional[bool] = False
    rating: Optional[float] = None

    # Most recent note data (if any)
    latest_note: Optional[str] = None
    latest_note_date: Optional[datetime] = None

    # Removed cellar-related fields

    # Timestamps of user interactions
    last_interaction: Optional[datetime] = None


# Response for the my-wines list endpoint
class PaginatedEnrichedWineResponse(BaseModel):
    items: List[EnrichedUserWine]
    total: int
