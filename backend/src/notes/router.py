from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Request

from src.auth.utils import get_current_user
from src.notes import service
from src.notes.schemas import Note, NoteCreate, NoteUpdate, NoteUpsertPayload

router = APIRouter(
    prefix="/notes",
    tags=["notes"],
)


@router.post("/", response_model=Note)
async def create_note(note: NoteCreate, current_user=Depends(get_current_user)):
    """Create a new note"""
    # Set the user_id to the authenticated user
    note.user_id = current_user

    result = await service.create_note(note)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create note")
    return result


@router.get("/user/{user_id}", response_model=List[dict])
async def get_notes_by_user(user_id: UUID, current_user=Depends(get_current_user)):
    """Get all notes for a user"""
    # Ensure the user ID matches the authenticated user
    if user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access these notes"
        )

    notes = await service.get_notes_by_user(user_id)
    return notes


@router.get("/wine/{wine_id}", response_model=List[Note])
async def get_notes_by_wine(wine_id: UUID, current_user=Depends(get_current_user)):
    """Get a user's notes for a specific wine"""
    notes = await service.get_notes_by_user_wine(current_user, wine_id)
    return notes


@router.get("/{note_id}", response_model=Note)
async def get_note_by_id(
    note_id: UUID = Path(..., description="The ID of the note to retrieve"),
    current_user=Depends(get_current_user),
):
    """Get a single note by its ID"""
    note = await service.get_note_by_id(note_id)

    # Check if note exists
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Check if the user is authorized to access this note
    if note.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this note"
        )

    return note


@router.patch("/{note_id}", response_model=Note)
async def update_note(
    note_id: UUID,
    note_data: NoteUpdate,
    current_user=Depends(get_current_user),
):
    """Update a note"""
    # First get the existing note to check ownership
    existing_notes = await service.get_notes_by_user(current_user)
    existing_note = next(
        (n for n in existing_notes if str(n["id"]) == str(note_id)), None
    )

    if not existing_note:
        raise HTTPException(
            status_code=404, detail="Note not found or not owned by user"
        )

    updated_note = await service.update_note(note_id, note_data)
    if not updated_note:
        raise HTTPException(status_code=400, detail="Failed to update note")

    return updated_note


@router.delete("/{note_id}", response_model=dict)
async def delete_note(note_id: UUID, current_user=Depends(get_current_user)):
    """Delete a note"""
    # First get the existing note to check ownership
    existing_notes = await service.get_notes_by_user(current_user)
    existing_note = next(
        (n for n in existing_notes if str(n["id"]) == str(note_id)), None
    )

    if not existing_note:
        raise HTTPException(
            status_code=404, detail="Note not found or not owned by user"
        )

    success = await service.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete note")

    return {"success": True, "message": "Note deleted successfully"}


@router.post(
    "/upsert",
    response_model=Note,
    status_code=200,
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"},
    },
)
async def upsert_note_endpoint(
    note_data: NoteUpsertPayload,
    current_user: UUID = Depends(get_current_user),
) -> Note:
    """
    Upsert a note for a wine (create if it doesn't exist or update if it exists)
    """
    result = await service.upsert_note(note_data=note_data, user_id=current_user)
    if not result:
        raise HTTPException(status_code=404, detail="Note could not be upserted")
    return result
