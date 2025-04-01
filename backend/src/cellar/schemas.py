from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class CellarBase(BaseModel):
    """Base fields for a cellar"""

    name: str
    sections: Optional[List[str]] = None
    image_url: Optional[HttpUrl] = None


class CellarCreate(CellarBase):
    """Fields required to create a cellar"""

    user_id: UUID


class CellarUpdate(BaseModel):
    """Fields that can be updated"""

    name: Optional[str] = None
    sections: Optional[List[str]] = None
    image_url: Optional[HttpUrl] = None


class Cellar(CellarBase):
    """Full cellar model with all fields"""

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CellarWineBase(BaseModel):
    """Base fields for a cellar wine"""

    cellar_id: UUID
    wine_id: UUID
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    quantity: int = 1
    size: Optional[str] = None  # 750ml, 1.5L, etc.
    section: Optional[str] = None  # Which section of the cellar it's in
    condition: Optional[str] = None  # e.g., "excellent", "damaged"
    status: str = "in_stock"  # in_stock, consumed, gifted, sold


class CellarWineCreate(CellarWineBase):
    """Fields required to create a cellar wine"""

    pass


class CellarWineUpdate(BaseModel):
    """Fields that can be updated for a cellar wine"""

    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    quantity: Optional[int] = None
    size: Optional[str] = None
    section: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None


class CellarWine(CellarWineBase):
    """Full cellar wine model with all fields"""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CellarWineResponse(CellarWine):
    """Cellar wine with embedded wine details"""

    wine: dict  # Will contain wine details


class CellarListParams(BaseModel):
    """Parameters for listing cellars"""

    user_id: Optional[UUID] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class CellarWineListParams(BaseModel):
    """Parameters for listing wines in a cellar"""

    cellar_id: UUID
    section: Optional[str] = None
    status: Optional[str] = None
    query: Optional[str] = None  # For searching wine name, winery, etc.
    sort_by: Optional[str] = "created_at"  # Which field to sort by
    sort_desc: bool = True  # Sort direction
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class CellarStatistics(BaseModel):
    """Statistics for a cellar"""

    total_bottles: int
    total_value: float
    bottles_by_type: Dict[str, int]  # e.g., {"red": 10, "white": 5}
    bottles_by_region: Dict[str, int]  # e.g., {"Bordeaux": 8, "Burgundy": 7}
    bottles_by_vintage: Dict[str, int]  # e.g., {"2015": 5, "2016": 10}


class CellarListResult(BaseModel):
    """Result from listing cellars"""

    items: List[Cellar]
    total: int


class CellarWineListResult(BaseModel):
    """Result from listing cellar wines"""

    items: List[CellarWineResponse]
    total: int
