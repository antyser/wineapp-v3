from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_serializer


class CellarBase(BaseModel):
    """Base fields for a cellar"""

    name: str
    sections: Optional[List[str]] = None
    image_url: Optional[HttpUrl] = None


class CellarCreate(CellarBase):
    """Fields required to create a cellar"""

    user_id: Optional[UUID] = None


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

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "user_id")
    def serialize_uuid(self, uuid_value: UUID) -> str:
        return str(uuid_value)

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()


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

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "cellar_id", "wine_id")
    def serialize_uuid(self, uuid_value: UUID) -> str:
        return str(uuid_value)

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

    @field_serializer("purchase_date")
    def serialize_date(self, dt: Optional[date]) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat()


class CellarWineResponse(CellarWine):
    """Cellar wine with embedded wine details"""

    wine: dict  # Will contain wine details

    @field_serializer("wine")
    def serialize_wine(self, wine_dict: dict) -> dict:
        # Process any UUID or datetime values in the wine dictionary
        result = {}
        for key, value in wine_dict.items():
            if isinstance(value, UUID):
                result[key] = str(value)
            elif hasattr(value, "isoformat"):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result


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
