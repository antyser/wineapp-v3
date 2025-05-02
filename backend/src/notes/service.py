from typing import List, Optional
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from postgrest import APIError
from supabase import Client

from src.core.supabase import get_supabase_client
from src.notes.schemas import Note, NoteCreate, NoteUpdate, NoteUpsertPayload


async def get_notes_by_user_wine(
    user_id: UUID, wine_id: UUID, client: Optional[Client] = None
) -> List[Note]:
    """
    Get all notes for a specific user and wine.

    Args:
        user_id: UUID of the user
        wine_id: UUID of the wine
        client: Optional Supabase client (will use default if not provided)

    Returns:
        List of Note objects if found, empty list otherwise
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

        return (
            [Note.model_validate(note) for note in response.data]
            if response.data
            else []
        )
    except APIError as e:
        # Log the error here if needed
        return []


async def create_note(note: NoteCreate) -> Optional[Note]:
    """Create a new note"""
    try:
        supabase = get_supabase_client()
        response = supabase.table("notes").insert(jsonable_encoder(note)).execute()
        return Note.model_validate(response.data[0]) if response.data else None
    except Exception as e:
        # Log the error here if needed
        return None


async def update_note(note_id: UUID, note: NoteUpdate) -> Optional[Note]:
    """Update an existing note"""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("notes")
            .update(jsonable_encoder(note))
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
        response = supabase.table("notes").delete().eq("id", str(note_id)).execute()
        return bool(response.data)
    except Exception as e:
        # Log the error here if needed
        return False


async def get_notes_by_user(user_id: UUID) -> List[dict]:
    """Get all notes for a user"""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("notes")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        # Log the error here if needed
        return []


async def get_note_by_id(note_id: UUID) -> Optional[Note]:
    """
    Get a note by its ID.

    Args:
        note_id: UUID of the note

    Returns:
        Note object if found, None otherwise
    """
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("notes")
            .select("*")
            .eq("id", str(note_id))
            .limit(1)
            .execute()
        )

        return Note.model_validate(response.data[0]) if response.data else None
    except Exception as e:
        # Log the error here if needed
        return None


async def get_note_by_id_and_user(note_id: UUID, user_id: UUID) -> Optional[Note]:
    """
    Get a note by its ID only if it belongs to the specified user.

    Args:
        note_id: UUID of the note
        user_id: UUID of the user who must own the note

    Returns:
        Note object if found and owned by the user, None otherwise
    """
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("notes")
            .select("*")
            .eq("id", str(note_id))
            .eq("user_id", str(user_id))
            .limit(1)
            .execute()
        )

        return Note.model_validate(response.data[0]) if response.data else None
    except Exception as e:
        # Log the error here if needed
        print(f"Error in get_note_by_id_and_user: {e}")
        return None


async def upsert_note(note_data: NoteUpsertPayload, user_id: UUID) -> Optional[Note]:
    """
    Upsert a note (create if it doesn't exist or update if it exists).
    Prioritizes update if note_id is provided and valid for the user.

    Args:
        note_data: Note data to upsert, potentially including note_id
        user_id: UUID of the user

    Returns:
        Note object if successful, None otherwise
    """
    try:
        supabase = get_supabase_client()
        note_to_create = None
        note_to_update_id = None

        if note_data.note_id:
            existing_note = await get_note_by_id_and_user(note_data.note_id, user_id)
            if existing_note:
                note_to_update_id = existing_note.id
            else:
                note_to_create = NoteCreate(
                    id=note_data.note_id, 
                    user_id=user_id,
                    wine_id=note_data.wine_id,
                    note_text=note_data.note_text,
                    tasting_date=note_data.tasting_date,
                )
        else:
             note_to_create = NoteCreate(
                user_id=user_id,
                wine_id=note_data.wine_id,
                note_text=note_data.note_text,
                tasting_date=note_data.tasting_date,
            )

        if note_to_update_id:
            # Perform update
            print(f"Upserting: Updating note {note_to_update_id}")
            update_payload = NoteUpdate(
                note_text=note_data.note_text, tasting_date=note_data.tasting_date
            )
            updated_note = await update_note(note_to_update_id, update_payload)
            return updated_note
        elif note_to_create:
             # Perform create
             if hasattr(note_to_create, 'id') and note_to_create.id:
                 print(f"Upserting: Creating new note (ID: {note_to_create.id})")
             else:
                 print(f"Upserting: Creating new note (ID: Auto)")
             created_note = await create_note(note_to_create)
             return created_note
        else:
             print("Upsert logic error: Neither update nor create path taken.")
             return None

    except Exception as e:
        print(f"Error in upsert_note: {e}")
        return None
