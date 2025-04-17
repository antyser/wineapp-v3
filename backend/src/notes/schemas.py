from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from src.models import DBBaseModel


class NoteBase(BaseModel):
    """Base fields for a note"""

    user_id: UUID
    wine_id: UUID
    tasting_date: Optional[date] = None
    note_text: str


class NoteCreate(NoteBase):
    """Fields required to create a new note"""

    pass


class NoteUpdate(BaseModel):
    """Fields that can be updated for a note"""

    tasting_date: Optional[date] = None
    note_text: Optional[str] = None


class Note(NoteBase, DBBaseModel):
    """Note model with all fields"""

    id: UUID
