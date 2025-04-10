from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from src.models import DBBaseModel
from src.wines.schemas import Wine  # Import the new base model


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


class SearchHistory(SearchHistoryBase, DBBaseModel):
    """Schema for a complete search history record"""

    id: UUID
    user_id: UUID
    created_at: datetime


class SearchHistoryItemResponse(SearchHistoryBase, DBBaseModel):
    """Enhanced search history item with wine details"""

    id: UUID
    user_id: UUID
    created_at: datetime
    wines: Optional[List[Wine]] = None


class SearchHistoryResponse(BaseModel):
    """Response model for search history endpoint"""

    items: List[SearchHistoryItemResponse]
    total: int
    limit: int
    offset: int
