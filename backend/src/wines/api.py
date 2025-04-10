import asyncio
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from loguru import logger

from src.auth import get_optional_user
from src.search.schemas import SearchHistoryCreate, SearchType
from src.search.service import ai_search_wines
from src.wines import service
from src.wines.schemas import Wine, WineCreate, WineSearchParams, WineUpdate
from src.wines.service import create_wine, delete_wine, get_wine, get_wines, update_wine

router = APIRouter(prefix="/wines", tags=["wines"])


@router.get("/", response_model=List[Wine])
async def get_all_wines(params: WineSearchParams = Depends()):
    result = await service.get_wines(params)
    return result["items"]


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
