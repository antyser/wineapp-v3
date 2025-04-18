from datetime import date
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel

from src.models import DBBaseModel


class InteractionBase(BaseModel):
    """Base fields for user interactions with wines"""

    user_id: UUID
    wine_id: UUID
    liked: Optional[bool] = False
    wishlist: Optional[bool] = False
    rating: Optional[float] = None  # Float for ratings between 1-5
    tasted: Optional[bool] = False


class InteractionCreate(InteractionBase, DBBaseModel):
    """Fields required to create a new interaction"""

    pass


class InteractionUpdate(BaseModel):
    """Fields that can be updated for an interaction"""

    liked: Optional[bool] = None
    wishlist: Optional[bool] = None
    rating: Optional[float] = None
    tasted: Optional[bool] = None


class Interaction(InteractionBase, DBBaseModel):
    """Interaction model with all fields"""

    id: UUID
