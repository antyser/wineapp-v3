import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from loguru import logger
from supabase import Client

from src.core import get_supabase_client
from src.search.history.schemas import (
    SearchHistory,
    SearchHistoryCreate,
    SearchHistoryItemResponse,
    SearchHistoryResponse,
)
from src.wines.schemas import Wine
from src.wines.service import get_wines_by_ids


async def create_search_history_record(
    history_data: SearchHistoryCreate, client: Optional[Client] = None
) -> Optional[SearchHistory]:
    """
    Create a new search history record.

    Args:
        history_data: Search history data to create
        client: Supabase client (optional, will use admin client if not provided)

    Returns:
        Created search history record if successful, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Convert the model to dict for inserting
        history_dict = history_data.model_dump(
            mode="json"
        )  # Use json mode to ensure UUIDs are serialized

        # We should no longer need this with the model_dump(mode="json") but let's keep it as a safety net
        # Convert UUIDs to strings for storage
        if "user_id" in history_dict and isinstance(history_dict["user_id"], UUID):
            history_dict["user_id"] = str(history_dict["user_id"])

        if history_dict.get("result_wine_ids") is not None:
            history_dict["result_wine_ids"] = [
                str(wine_id) if isinstance(wine_id, UUID) else wine_id
                for wine_id in history_dict["result_wine_ids"]
            ]

        # Insert the record
        logger.info(f"Creating search history record: {history_dict}")
        response = client.table("search_history").insert(history_dict).execute()

        if response.data and len(response.data) > 0:
            # Convert the response to a SearchHistory model
            return SearchHistory.model_validate(response.data[0])

        logger.warning("No data returned when creating search history record")
        return None

    except Exception as e:
        logger.error(f"Error creating search history record: {str(e)}")
        return None


async def get_search_history_for_user(
    user_id: UUID,
    limit: int = 20,
    offset: int = 0,
    client: Optional[Client] = None,
) -> SearchHistoryResponse:
    """
    Get search history records for a user with wine details.

    Args:
        user_id: UUID of the user
        limit: Maximum number of records to return
        offset: Number of records to skip
        client: Supabase client (optional, will use admin client if not provided)

    Returns:
        SearchHistoryResponse with items and metadata
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Convert UUID to string for Supabase query
        user_id_str = str(user_id)
        logger.info(f"Getting search history for user {user_id_str}")

        # Count total records first
        count_response = (
            client.table("search_history")
            .select("id", count="exact")
            .eq("user_id", user_id_str)
            .execute()
        )

        total_count = count_response.count if hasattr(count_response, "count") else 0
        logger.info(
            f"Total search history records for user {user_id_str}: {total_count}"
        )

        # Query the search_history table
        response = (
            client.table("search_history")
            .select("*")
            .eq("user_id", user_id_str)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        logger.info(f"Found {len(response.data or [])} search history records")

        if not response.data:
            return SearchHistoryResponse(items=[], total=0, limit=limit, offset=offset)

        # Convert the response to SearchHistory models first
        history_items = [SearchHistory.model_validate(item) for item in response.data]

        # Initialize the response items
        response_items: List[SearchHistoryItemResponse] = []

        # Collect all wine IDs that need to be fetched
        all_wine_ids: List[UUID] = []
        for item in history_items:
            if item.result_wine_ids:
                all_wine_ids.extend(item.result_wine_ids)

        all_wine_ids = list(set(all_wine_ids))  # Remove duplicates

        # Fetch wine details
        wine_details_map: Dict[UUID, Wine] = {}
        if all_wine_ids:
            logger.info(f"Fetching details for {len(all_wine_ids)} unique wines")

            try:
                wines = await get_wines_by_ids(all_wine_ids)

                # Create a map of wine IDs to wine details
                for wine in wines:
                    wine_details_map[wine.id] = wine

                logger.info(
                    f"Found {len(wine_details_map)} wines out of {len(all_wine_ids)} requested"
                )
            except Exception as wine_e:
                logger.error(f"Error fetching wine details: {wine_e}")

        # Create the enriched response items
        for item in history_items:
            wines_list = None

            if item.result_wine_ids:
                # Get the wine details for each ID, if available
                wines_list = [
                    wine_details_map.get(wine_id)
                    for wine_id in item.result_wine_ids
                    if wine_id in wine_details_map
                ]

            # Create the response item with wine details
            response_item = SearchHistoryItemResponse(
                id=item.id,
                user_id=item.user_id,
                search_type=item.search_type,
                search_query=item.search_query,
                result_wine_ids=item.result_wine_ids,
                created_at=item.created_at,
                wines=wines_list,
            )

            response_items.append(response_item)

        # Return the final response with metadata
        return SearchHistoryResponse(
            items=response_items, total=total_count, limit=limit, offset=offset
        )

    except Exception as e:
        logger.error(f"Error getting search history for user {user_id}: {str(e)}")
        # Return an empty response on error
        return SearchHistoryResponse(items=[], total=0, limit=limit, offset=offset)


async def get_user_scan_image_for_wine(
    user_id: UUID, wine_id: UUID, client: Optional[Client] = None
) -> Optional[str]:
    """
    Find a user's scan image that features only the specified wine.

    Args:
        user_id: UUID of the user
        wine_id: UUID of the wine
        client: Optional Supabase client (will use default if not provided)

    Returns:
        URL of the scan image if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Query for image search history that includes this wine
        response = (
            client.table("search_history")
            .select("*")
            .eq("user_id", str(user_id))
            .contains("result_wine_ids", [str(wine_id)])
            .eq("search_type", "image")  # Only get image searches
            .order("created_at", desc=True)
            .execute()
        )

        # Look for an image that features only this wine
        if response.data and len(response.data) > 0:
            for history in response.data:
                # Check if this search result contains only the current wine
                if (
                    history.get("result_wine_ids")
                    and len(history.get("result_wine_ids")) == 1
                    and str(wine_id) in history.get("result_wine_ids")
                ):
                    if history.get("search_query"):
                        return history.get("search_query")

        return None

    except Exception as e:
        logger.error(f"Error getting user scan image for wine: {str(e)}")
        return None


async def get_search_history_for_user_wine(
    user_id: UUID, wine_id: UUID, client: Optional[Client] = None
) -> List[SearchHistory]:
    """
    Get search history entries that include the specified wine for a user.

    Args:
        user_id: UUID of the user
        wine_id: UUID of the wine
        client: Optional Supabase client (will use default if not provided)

    Returns:
        List of search history entries
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Query for search history that includes this wine
        response = (
            client.table("search_history")
            .select("*")
            .eq("user_id", str(user_id))
            .contains("result_wine_ids", [str(wine_id)])
            .order("created_at", desc=True)
            .execute()
        )

        return response.data if response.data else []

    except Exception as e:
        logger.error(f"Error getting search history for user wine: {str(e)}")
        return []
