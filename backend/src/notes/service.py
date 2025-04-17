from typing import List, Optional
from uuid import UUID

from postgrest import APIError
from supabase import Client

from src.core.supabase import get_supabase_client
from src.notes.schemas import Note, NoteCreate, NoteUpdate


async def get_notes_by_user_wine(
    user_id: UUID, wine_id: UUID, client: Optional[Client] = None
) -> List[dict]:
    """
    Get all notes for a specific user and wine.

    Args:
        user_id: UUID of the user
        wine_id: UUID of the wine
        client: Optional Supabase client (will use default if not provided)

    Returns:
        List of note objects if found, empty list otherwise
    """
    if client is None:
        client = get_supabase_client()

    try:
        response = (
            client.table("notes")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("wine_id", str(wine_id))
            .order("created_at", desc=True)
            .execute()
        )

        return response.data if response.data else []
    except APIError as e:
        # Log the error here if needed
        return []


async def create_note(note: NoteCreate) -> Optional[Note]:
    """Create a new note"""
    try:
        supabase = get_supabase_client()
        response = await supabase.table("notes").insert(note.dict()).execute()
        return Note.model_validate(response.data[0]) if response.data else None
    except Exception as e:
        # Log the error here if needed
        return None


async def update_note(note_id: UUID, note: NoteUpdate) -> Optional[Note]:
    """Update an existing note"""
    try:
        supabase = get_supabase_client()
        response = (
            await supabase.table("notes")
            .update(note.dict(exclude_unset=True))
            .eq("id", str(note_id))
            .execute()
        )
        return Note.model_validate(response.data[0]) if response.data else None
    except Exception as e:
        # Log the error here if needed
        return None


async def delete_note(note_id: UUID) -> bool:
    """Delete a note"""
    try:
        supabase = get_supabase_client()
        response = (
            await supabase.table("notes").delete().eq("id", str(note_id)).execute()
        )
        return bool(response.data)
    except Exception as e:
        # Log the error here if needed
        return False


async def get_notes_by_user(user_id: UUID) -> List[dict]:
    """Get all notes for a user"""
    try:
        supabase = get_supabase_client()
        response = (
            await supabase.table("notes")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        # Log the error here if needed
        return []
