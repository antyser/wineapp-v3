from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Body, HTTPException, Path, Query, status

from src.wines import service
from src.wines.schemas import (
    Wine,
    WineCreate,
    WineSearchParams,
    WineSearchResults,
    WineUpdate,
)
from src.wines.service import create_wine, delete_wine, get_wine, get_wines, update_wine

router = APIRouter(prefix="/wines", tags=["wines"])


@router.get("", response_model=WineSearchResults)
async def list_wines(
    # Query parameters for filtering and pagination
    query: Annotated[
        str | None, Query(description="Search term for wine name, winery, etc.")
    ] = None,
    region: Annotated[str | None, Query(description="Filter by region")] = None,
    country: Annotated[str | None, Query(description="Filter by country")] = None,
    varietal: Annotated[
        str | None, Query(description="Filter by grape variety")
    ] = None,
    type: Annotated[
        str | None, Query(description="Filter by wine type (red, white, etc.)")
    ] = None,
    min_price: Annotated[float | None, Query(description="Minimum price")] = None,
    max_price: Annotated[float | None, Query(description="Maximum price")] = None,
    min_rating: Annotated[
        int | None, Query(description="Minimum rating (0-100)")
    ] = None,
    min_vintage: Annotated[
        int | None, Query(description="Minimum vintage year")
    ] = None,
    max_vintage: Annotated[
        int | None, Query(description="Maximum vintage year")
    ] = None,
    limit: Annotated[
        int, Query(description="Number of results per page", ge=1, le=100)
    ] = 20,
    offset: Annotated[int, Query(description="Number of results to skip", ge=0)] = 0,
) -> WineSearchResults:
    """
    Get a list of wines with optional filtering and pagination
    """
    # Construct search parameters
    search_params = WineSearchParams(
        query=query,
        region=region,
        country=country,
        varietal=varietal,
        type=type,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        min_vintage=min_vintage,
        max_vintage=max_vintage,
        limit=limit,
        offset=offset,
    )

    # Get wines
    result = await get_wines(search_params)

    # Return results
    return WineSearchResults(items=result["items"], total=result["total"])


@router.get("/{wine_id}", response_model=Wine)
async def get_wine_by_id(
    wine_id: Annotated[UUID, Path(description="The UUID of the wine to get")],
) -> Wine:
    """
    Get a wine by ID
    """
    wine = await get_wine(wine_id)
    if wine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wine with ID {wine_id} not found",
        )
    return wine


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Wine)
async def create_new_wine(
    wine: Annotated[WineCreate, Body(description="Wine data to create")],
) -> Wine:
    """
    Create a new wine
    """
    return await create_wine(wine)


@router.patch("/{wine_id}", response_model=Wine)
async def update_wine_by_id(
    wine_id: Annotated[UUID, Path(description="The UUID of the wine to update")],
    wine: Annotated[WineUpdate, Body(description="Wine data to update")],
) -> Wine:
    """
    Update a wine by ID
    """
    updated_wine = await update_wine(wine_id, wine)
    if updated_wine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wine with ID {wine_id} not found",
        )
    return updated_wine


@router.delete("/{wine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wine_by_id(
    wine_id: Annotated[UUID, Path(description="The UUID of the wine to delete")],
) -> None:
    """
    Delete a wine by ID
    """
    deleted = await delete_wine(wine_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wine with ID {wine_id} not found",
        )


@router.get("/search/wine-searcher", response_model=Wine)
async def search_wine_searcher(
    query: Annotated[str, Query(description="Wine name to search for")],
    vintage: Annotated[
        Optional[int], Query(description="Optional vintage to search for")
    ] = None,
    use_crawler: Annotated[
        bool, Query(description="Use third-party crawler (Firecrawl)")
    ] = True,
):
    """
    Search for wine on Wine-Searcher and return first result

    This endpoint searches for wines on Wine-Searcher.com using the provided query.
    It returns the first result found, or 404 if no wine is found.

    The search can use a third-party crawler (Firecrawl) or fetch directly with HTTP/2.
    """
    wine = await service.fetch_wine_from_wine_searcher(
        query, vintage, use_crawler=use_crawler
    )
    if not wine:
        raise HTTPException(status_code=404, detail="Wine not found on Wine-Searcher")
    return wine
