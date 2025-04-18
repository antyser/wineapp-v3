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

    user_id: Optional[UUID] = None


class NoteUpdate(BaseModel):
    """Fields that can be updated for a note"""

    tasting_date: Optional[date] = None
    note_text: Optional[str] = None


class NoteUpsertPayload(BaseModel):
    """Payload for upserting a note (create if not exists, update if exists)"""

    wine_id: UUID
    tasting_date: Optional[date] = None
    note_text: str


class Note(NoteBase, DBBaseModel):
    """Note model with all fields"""

    id: UUID
