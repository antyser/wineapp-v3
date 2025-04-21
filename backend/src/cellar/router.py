from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from src.auth.utils import get_current_user
from src.cellar import service
from src.cellar.schemas import (
    Cellar,
    CellarCreate,
    CellarListParams,
    CellarListResult,
    CellarStatistics,
    CellarUpdate,
    CellarWineCreate,
    CellarWineListParams,
    CellarWineListResult,
    CellarWineResponse,
    CellarWineUpdate,
)

router = APIRouter(prefix="/cellars", tags=["cellars"])


@router.get("", response_model=CellarListResult)
async def list_cellars(
    user_id: Annotated[Optional[UUID], Query(description="Filter by user ID")] = None,
    limit: Annotated[
        int, Query(ge=1, le=100, description="Maximum number of results to return")
    ] = 20,
    offset: Annotated[int, Query(ge=0, description="Number of results to skip")] = 0,
    current_user: UUID = Depends(get_current_user),
):
    """
    List cellars with optional filtering
    """
    # If no user_id is provided, use the authenticated user's ID
    if user_id is None:
        user_id = current_user
    # Otherwise, ensure the requesting user can only see their own cellars
    elif user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access other users' cellars"
        )

    params = CellarListParams(user_id=user_id, limit=limit, offset=offset)
    return await service.get_cellars(params)


@router.get("/{cellar_id}", response_model=Cellar)
async def get_cellar(
    cellar_id: Annotated[UUID, Path(description="The ID of the cellar to retrieve")],
    current_user: UUID = Depends(get_current_user),
):
    """
    Get a cellar by ID
    """
    cellar = await service.get_cellar(cellar_id)
    if not cellar:
        raise HTTPException(status_code=404, detail="Cellar not found")

    # Ensure the user has access to this cellar
    if cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this cellar"
        )

    return cellar


@router.post("", response_model=Cellar, status_code=201)
async def create_cellar(
    cellar: CellarCreate, current_user: UUID = Depends(get_current_user)
):
    """
    Create a new cellar
    """
    cellar.user_id = str(current_user)

    return await service.create_cellar(cellar)


@router.patch("/{cellar_id}", response_model=Cellar)
async def update_cellar(
    cellar_id: Annotated[UUID, Path(description="The ID of the cellar to update")],
    cellar: CellarUpdate,
    current_user: UUID = Depends(get_current_user),
):
    """
    Update a cellar
    """
    # First check if cellar exists and user has access
    existing_cellar = await service.get_cellar(cellar_id)
    if not existing_cellar:
        raise HTTPException(status_code=404, detail="Cellar not found")

    # Ensure the user has access to this cellar
    if existing_cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this cellar"
        )

    updated_cellar = await service.update_cellar(cellar_id, cellar)
    if not updated_cellar:
        raise HTTPException(status_code=404, detail="Cellar not found")
    return updated_cellar


@router.delete("/{cellar_id}", status_code=204)
async def delete_cellar(
    cellar_id: Annotated[UUID, Path(description="The ID of the cellar to delete")],
    current_user: UUID = Depends(get_current_user),
):
    """
    Delete a cellar
    """
    # First check if cellar exists and user has access
    existing_cellar = await service.get_cellar(cellar_id)
    if not existing_cellar:
        raise HTTPException(status_code=404, detail="Cellar not found")

    # Ensure the user has access to this cellar
    if existing_cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this cellar"
        )

    success = await service.delete_cellar(cellar_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cellar not found")
    return None


@router.get("/{cellar_id}/wines", response_model=CellarWineListResult)
async def list_cellar_wines(
    cellar_id: Annotated[UUID, Path(description="The ID of the cellar")],
    section: Annotated[
        Optional[str], Query(description="Filter by cellar section")
    ] = None,
    status: Annotated[
        Optional[str], Query(description="Filter by status (e.g. in_stock, consumed)")
    ] = None,
    query: Annotated[
        Optional[str], Query(description="Search query for wine name, winery, etc.")
    ] = None,
    sort_by: Annotated[
        Optional[str], Query(description="Field to sort by")
    ] = "created_at",
    sort_desc: Annotated[
        bool, Query(description="Sort direction (true for descending)")
    ] = True,
    limit: Annotated[
        int, Query(ge=1, le=100, description="Maximum number of results to return")
    ] = 20,
    offset: Annotated[int, Query(ge=0, description="Number of results to skip")] = 0,
    current_user: UUID = Depends(get_current_user),
):
    """
    List wines in a cellar with optional filtering
    """
    # First check if cellar exists
    cellar = await service.get_cellar(cellar_id)
    if not cellar:
        raise HTTPException(status_code=404, detail="Cellar not found")

    # Ensure the user has access to this cellar
    if cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this cellar"
        )

    params = CellarWineListParams(
        cellar_id=cellar_id,
        section=section,
        status=status,
        query=query,
        sort_by=sort_by,
        sort_desc=sort_desc,
        limit=limit,
        offset=offset,
    )

    return await service.get_cellar_wines(params)


@router.get("/{cellar_id}/statistics", response_model=CellarStatistics)
async def get_cellar_statistics(
    cellar_id: Annotated[UUID, Path(description="The ID of the cellar")],
    current_user: UUID = Depends(get_current_user),
):
    """
    Get statistics for a cellar
    """
    # First check if cellar exists
    cellar = await service.get_cellar(cellar_id)
    if not cellar:
        raise HTTPException(status_code=404, detail="Cellar not found")

    # Ensure the user has access to this cellar
    if cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this cellar's statistics"
        )

    return await service.get_cellar_statistics(cellar_id)


@router.get("/wines/{cellar_wine_id}", response_model=CellarWineResponse)
async def get_cellar_wine(
    cellar_wine_id: Annotated[
        UUID, Path(description="The ID of the cellar wine to retrieve")
    ],
    current_user: UUID = Depends(get_current_user),
):
    """
    Get a specific wine in a cellar
    """
    cellar_wine = await service.get_cellar_wine(cellar_wine_id)
    if not cellar_wine:
        raise HTTPException(status_code=404, detail="Cellar wine not found")

    # Check if the cellar belongs to the current user
    cellar = await service.get_cellar(UUID(cellar_wine.cellar_id))
    if not cellar or cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this cellar wine"
        )

    return cellar_wine


@router.post("/wines", response_model=CellarWineResponse, status_code=201)
async def add_wine_to_cellar(
    cellar_wine: CellarWineCreate,
    current_user: UUID = Depends(get_current_user),
):
    """
    Add a wine to a cellar
    """
    # Check if the cellar belongs to the current user
    cellar = await service.get_cellar(cellar_wine.cellar_id)
    if not cellar or cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to add wine to this cellar"
        )

    try:
        return await service.add_wine_to_cellar(cellar_wine)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/wines/{cellar_wine_id}", response_model=CellarWineResponse)
async def update_cellar_wine(
    cellar_wine_id: Annotated[
        UUID, Path(description="The ID of the cellar wine to update")
    ],
    cellar_wine: CellarWineUpdate,
    current_user: UUID = Depends(get_current_user),
):
    """
    Update a wine in a cellar
    """
    # First get the cellar wine to check access
    existing_cellar_wine = await service.get_cellar_wine(cellar_wine_id)
    if not existing_cellar_wine:
        raise HTTPException(status_code=404, detail="Cellar wine not found")

    # Check if the cellar belongs to the current user
    cellar = await service.get_cellar(UUID(existing_cellar_wine.cellar_id))
    if not cellar or cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this cellar wine"
        )

    updated_cellar_wine = await service.update_cellar_wine(cellar_wine_id, cellar_wine)
    if not updated_cellar_wine:
        raise HTTPException(status_code=404, detail="Cellar wine not found")
    return updated_cellar_wine


@router.delete("/wines/{cellar_wine_id}", status_code=204)
async def remove_wine_from_cellar(
    cellar_wine_id: Annotated[
        UUID, Path(description="The ID of the cellar wine to remove")
    ],
    current_user: UUID = Depends(get_current_user),
):
    """
    Remove a wine from a cellar
    """
    # First get the cellar wine to check access
    existing_cellar_wine = await service.get_cellar_wine(cellar_wine_id)
    if not existing_cellar_wine:
        raise HTTPException(status_code=404, detail="Cellar wine not found")

    # Check if the cellar belongs to the current user
    cellar = await service.get_cellar(UUID(existing_cellar_wine.cellar_id))
    if not cellar or cellar.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to remove this cellar wine"
        )

    success = await service.remove_wine_from_cellar(cellar_wine_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cellar wine not found")
    return None
