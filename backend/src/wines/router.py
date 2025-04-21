import asyncio
from typing import Annotated, Dict, List, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from loguru import logger

from src.auth import get_current_user, get_optional_user
from src.auth.models import User
from src.wines import service
from src.wines.schemas import (
    MyWinesSearchParams,
    PaginatedEnrichedWineResponse,
    PaginatedWineResponse,
    UserWineResponse,
    Wine,
    WineCreate,
    WineSearchParams,
    WineUpdate,
)
from src.wines.service import (
    create_wine,
    delete_wine,
    get_user_wine,
    get_wine,
    get_wines,
    search_wines,
    update_wine,
)

router = APIRouter(prefix="/wines", tags=["wines"])


@router.get("/", response_model=PaginatedWineResponse)
async def get_all_wines(params: WineSearchParams = Depends()):
    return await service.get_wines(params)


@router.get("/my-wines", response_model=PaginatedEnrichedWineResponse)
async def search_current_user_wines(
    current_user: UUID = Depends(get_current_user),
    params: MyWinesSearchParams = Depends(),
):
    """
    Search for wines within the current authenticated user's interacted items
    (cellar, notes, wishlist).

    Returns enriched wine data with user interaction information.

    Allows filtering by name, type, country, region, winery, grape,
    and supports pagination and sorting.
    """
    logger.info(f"Searching my wines for user {current_user} with params: {params}")
    result = await service.search_wines(user_id=current_user, params=params)
    return result


@router.get("/{wine_id}", response_model=Wine)
async def get_one_wine(wine_id: UUID = Path(...)):
    wine = await service.get_wine(wine_id)
    if not wine:
        raise HTTPException(status_code=404, detail="Wine not found")
    return wine


@router.post("/", response_model=Wine, status_code=status.HTTP_201_CREATED)
async def create_new_wine(wine: WineCreate):
    return await service.create_wine(wine)


@router.patch("/{wine_id}", response_model=Wine)
async def update_existing_wine(wine_id: UUID, wine: WineUpdate):
    updated_wine = await service.update_wine(wine_id, wine)
    if not updated_wine:
        raise HTTPException(status_code=404, detail="Wine not found")
    return updated_wine


@router.delete("/{wine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_wine(wine_id: UUID):
    deleted = await service.delete_wine(wine_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Wine not found")
    return None


@router.get("/user/{wine_id}", response_model=UserWineResponse)
async def get_wine_for_user(
    wine_id: UUID = Path(...), current_user: UUID = Depends(get_current_user)
):
    """
    Get comprehensive wine information for the current user, including:
    1. Basic wine information
    2. User's interaction with the wine (likes, wishlist, rating, etc.)
    3. User's notes about the wine
    4. User's cellar information for this wine (bottles in their cellars)

    The wine's image will be replaced with the user's scan image if available.
    """
    result = await service.get_user_wine(wine_id, current_user)
    if not result.wine:
        raise HTTPException(status_code=404, detail="Wine not found")
    return result
