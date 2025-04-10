from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SearchType(str, Enum):
    """Enum for search types"""

    TEXT = "text"
    IMAGE = "image"


class SearchHistoryBase(BaseModel):
    """Base schema for search history"""

    search_type: SearchType
    search_query: Optional[str] = None
    result_wine_ids: Optional[List[UUID]] = Field(default=None)


class SearchHistoryCreate(SearchHistoryBase):
    """Schema for creating a search history record"""

    user_id: UUID


class SearchHistory(SearchHistoryBase):
    """Schema for a complete search history record"""

    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
