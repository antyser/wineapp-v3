from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Form, HTTPException, Query, status
from loguru import logger
from pydantic import BaseModel

from src.auth import get_current_user, get_optional_user
from src.core.storage_utils import download_image
from src.search.history.schemas import (
    SearchHistory,
    SearchHistoryCreate,
    SearchHistoryResponse,
)
from src.search.history.service import (
    create_search_history_record,
    get_search_history_for_user,
)
from src.search.service import ai_search_wines
from src.wines.schemas import Wine

router = APIRouter(prefix="/search", tags=["search"])


# Create a model for JSON request
class SearchRequest(BaseModel):
    text_input: Optional[str] = None
    image_url: Optional[str] = None


@router.post("", response_model=List[Wine])
async def search_wines_endpoint(
    user_id: Optional[UUID] = Depends(get_optional_user),
    search_data: Optional[SearchRequest] = Body(None),
):
    """
    Search for wines using text input or a Supabase image URL.
    Records the search attempt in the user's history.

    Args:
        user_id: UUID of the current user (from auth token)
        search_data: JSON request body with text_input and/or image_url

    Returns:
        List of found wines
    """
    # Initialize variables
    text_input = None
    image_url = None

    # Use JSON input if provided
    if search_data:
        text_input = search_data.text_input
        image_url = search_data.image_url

    logger.info(f"Search request: text_input={text_input}, image_url={image_url}")

    image_content: Optional[bytes] = None
    search_type = "unknown"
    search_query = ""

    if image_url:
        # Handle image URL (download from Supabase)
        image_content = await download_image(image_url)
        if not image_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to download image from provided URL.",
            )
        search_type = "image"
        search_query = image_url
    elif text_input:
        # Handle text search
        search_type = "text"
        search_query = text_input
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either text_input or image_url must be provided.",
        )

    try:
        # Perform the AI search
        logger.info(
            f"Starting AI search with text_input={text_input}, image_content={bool(image_content)}"
        )
        found_wines_dicts = await ai_search_wines(
            text_input=text_input, image_content=image_content
        )
        logger.info(f"Found {len(found_wines_dicts)} wines")

        # Convert dicts back to Wine models for response
        found_wines = [Wine.model_validate(w) for w in found_wines_dicts]
        logger.info(f"Validated {len(found_wines)} wine models")

        # Only record history if user is authenticated
        if user_id:
            logger.info(f"Recording search history for authenticated user {user_id}")
            # Prepare history record
            result_wine_ids = [wine.id for wine in found_wines]
            history_data = SearchHistoryCreate(
                user_id=user_id,
                search_type=search_type,
                search_query=search_query,
                result_wine_ids=result_wine_ids,
            )

            # Record search history (fire and forget, log errors)
            try:
                await create_search_history_record(history_data)
                logger.info(
                    f"Created search history record {history_data} for user {user_id}"
                )
            except Exception as history_e:
                logger.error(
                    f"Failed to create search history record for user {user_id}: {history_e}"
                )

        return found_wines

    except Exception as e:
        logger.error(f"Error during wine search for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during the search: {e}",
        )


@router.get("/history", response_model=SearchHistoryResponse)
async def get_user_search_history(
    user_id: UUID = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Get the current user's search history with enriched wine information.

    Args:
        user_id: UUID of the current user (from auth token)
        limit: Maximum number of records to return
        offset: Number of records to skip

    Returns:
        SearchHistoryResponse with items and metadata
    """
    return await get_search_history_for_user(
        user_id=user_id, limit=limit, offset=offset
    )
