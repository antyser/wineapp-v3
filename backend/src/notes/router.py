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
async def update_note_endpoint(
    note_id: UUID,
    note_data: NoteUpdate,
    current_user=Depends(get_current_user),
):
    """Update a note (using PATCH method)"""
    # Check ownership first before attempting update
    existing_note = await service.get_note_by_id_and_user(note_id, current_user)
    if not existing_note:
         raise HTTPException(status_code=404, detail="Note not found or user does not have permission")

    updated_note = await service.update_note(note_id, note_data)
    if not updated_note:
        raise HTTPException(status_code=400, detail="Failed to update note")

    return updated_note


@router.delete("/{note_id}", response_model=dict)
async def delete_note_endpoint(note_id: UUID, current_user=Depends(get_current_user)):
    """Delete a note"""
    # Check ownership first
    existing_note = await service.get_note_by_id_and_user(note_id, current_user)
    if not existing_note:
         raise HTTPException(status_code=404, detail="Note not found or user does not have permission")

    success = await service.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete note")

    return {"success": True, "message": "Note deleted successfully"}


@router.post(
    "/upsert",
    response_model=Note,
    status_code=200,
    summary="Upsert a Tasting Note",
    description="Creates a new note or updates an existing one based on the provided data, including an optional note_id.",
    responses={
        200: {"description": "Note upserted successfully"},
        201: {"description": "Note created successfully"}, # Although upsert might always return 200
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden (Attempting to update note not owned by user)"},
        404: {"description": "Not Found (Should not happen with upsert logic)"},
        422: {"description": "Validation Error"},
    },
)
async def upsert_note_endpoint(
    note_data: NoteUpsertPayload, # Uses the updated schema
    current_user: UUID = Depends(get_current_user),
) -> Note:
    """
    Upsert a note for a wine. 
    - If `note_id` is provided and belongs to the user, it updates the note.
    - If `note_id` is provided but doesn't exist or belong to the user, it attempts to create a new note with that ID.
    - If `note_id` is not provided, it attempts to create a new note.
    """
    result = await service.upsert_note(note_data=note_data, user_id=current_user)
    # The service layer handles the actual upsert logic and potential errors like ID conflicts or ownership issues
    if result is None:
        # Determine appropriate error - service layer should ideally raise specific exceptions
        raise HTTPException(status_code=400, detail="Note could not be upserted. Check data or permissions.")
    elif hasattr(result, 'status_code'): # Check if service returned an error response directly (less ideal)
         raise HTTPException(status_code=result.status_code, detail=result.detail)

    # Consider returning 201 if a new note was created, requires service layer feedback
    return result
