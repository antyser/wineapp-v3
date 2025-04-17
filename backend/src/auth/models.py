from datetime import datetime
from typing import Optional
from uuid import UUID

from src.models import DBBaseModel


class User(DBBaseModel):
    """User model representing an authenticated user"""

    id: UUID
    email: str
    created_at: datetime
    updated_at: datetime
    last_sign_in_at: Optional[datetime] = None
