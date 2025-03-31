from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


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
    notes: Optional[str] = None


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
    notes: Optional[str] = None
    image_url: Optional[HttpUrl] = None


class Wine(WineBase):
    """Full wine model with all fields"""
    id: UUID
    image_url: Optional[HttpUrl] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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