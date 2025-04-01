import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.supabase import get_supabase, get_supabase_admin
from app.schemas.wine import Wine, WineCreate
from supabase import Client

router = APIRouter()


@router.get("/", response_model=List[Wine])
async def read_wines(
    skip: int = 0, limit: int = 100, supabase: Client = Depends(get_supabase)
):
    """
    Retrieve wines with pagination.
    """
    try:
        response = (
            supabase.table("wines").select("*").range(skip, skip + limit).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wines: {str(e)}",
        )


@router.get("/{wine_id}", response_model=Wine)
async def read_wine(wine_id: str, supabase: Client = Depends(get_supabase)):
    """
    Get a specific wine by ID.
    """
    try:
        response = (
            supabase.table("wines").select("*").eq("id", wine_id).single().execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wine with ID {wine_id} not found",
            )
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wine: {str(e)}",
        )


@router.post("/", response_model=Wine, status_code=status.HTTP_201_CREATED)
async def create_wine(
    wine: WineCreate,
    supabase: Client = Depends(
        get_supabase_admin
    ),  # Use admin client for wine creation
):
    """
    Create a new wine.
    """
    try:
        # Generate a UUID for the new wine
        wine_id = str(uuid.uuid4())

        # Prepare the data
        wine_data = {
            "id": wine_id,
            **wine.model_dump(),
        }

        # Insert into Supabase
        response = supabase.table("wines").insert(wine_data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create wine",
            )

        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating wine: {str(e)}",
        )


@router.put("/{wine_id}", response_model=Wine)
async def update_wine(
    wine_id: str,
    wine_update: WineCreate,
    supabase: Client = Depends(get_supabase_admin),  # Use admin client for wine updates
):
    """
    Update a wine by ID.
    """
    try:
        # Check if wine exists
        check_response = (
            supabase.table("wines").select("id").eq("id", wine_id).execute()
        )
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wine with ID {wine_id} not found",
            )

        # Update the wine
        update_data = {**wine_update.model_dump(), "updated_at": "now()"}

        response = (
            supabase.table("wines").update(update_data).eq("id", wine_id).execute()
        )

        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating wine: {str(e)}",
        )


@router.delete("/{wine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wine(
    wine_id: str,
    supabase: Client = Depends(
        get_supabase_admin
    ),  # Use admin client for wine deletion
):
    """
    Delete a wine by ID.
    """
    try:
        # Check if wine exists
        check_response = (
            supabase.table("wines").select("id").eq("id", wine_id).execute()
        )
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wine with ID {wine_id} not found",
            )

        # Delete the wine
        supabase.table("wines").delete().eq("id", wine_id).execute()

        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting wine: {str(e)}",
        )
