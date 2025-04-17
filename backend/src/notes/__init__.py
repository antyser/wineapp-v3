# Notes module
# Handles user tasting notes and reviews

from src.notes.router import router as notes_router
from src.notes.service import (
    create_note,
    delete_note,
    get_notes_by_user,
    get_notes_by_user_wine,
    update_note,
)

__all__ = [
    "notes_router",
    "get_notes_by_user_wine",
    "create_note",
    "update_note",
    "delete_note",
    "get_notes_by_user",
]
