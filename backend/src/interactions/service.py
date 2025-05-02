import asyncio
from typing import List, Optional
from uuid import UUID

from postgrest import APIError
from supabase import Client
from loguru import logger
from fastapi.encoders import jsonable_encoder
from src.core import get_supabase_client
from src.interactions.schemas import InteractionCreate, InteractionUpdate



async def get_interaction_by_user_wine(
    user_id: UUID, wine_id: UUID, client: Optional[Client] = None
) -> Optional[dict]:
    """
    Get a user's interaction with a specific wine

    Args:
        user_id: UUID of the user
        wine_id: UUID of the wine
        client: Optional Supabase client (will use default if not provided)

    Returns:
        Dictionary containing interaction data if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    try:
        query = (
            client.table("interactions")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("wine_id", str(wine_id))
        )

        response = query.execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except APIError as e:
        # Check if it's a unique violation (user already has an interaction with this wine)
        if "unique constraint" in str(e):
            return None
        # Re-raise other errors
        raise


async def upsert_interaction(
    user_id: UUID,
    wine_id: UUID,
    payload: InteractionUpdate,
    client: Optional[Client] = None
) -> Optional[dict]:
    """Upsert an interaction based on user_id and wine_id."""
    if client is None:
        client = get_supabase_client()

    # Convert payload to dict, excluding unset fields to allow partial updates
    update_data = payload.dict(exclude_unset=True)
    
    # Add user_id and wine_id for the upsert operation
    # Supabase upsert needs the primary key or unique constraint columns
    # Assuming (user_id, wine_id) is a unique constraint
    upsert_record = {
        **update_data,
        "user_id": str(user_id),
        "wine_id": str(wine_id),
    }

    logger.debug(f"Attempting upsert for user {user_id}, wine {wine_id} with data: {upsert_record}")

    try:
        # Use upsert() method
        query = client.table("interactions").upsert(upsert_record, on_conflict="user_id, wine_id")
        # Request returning the upserted record
        # response = query.execute(returning="representation") 
        response = query.execute() # Supabase py v1 may not support returning='representation' directly in upsert easily?
        # response = await query.execute()

        # After upsert, we might need to fetch the record again if upsert doesn't return it
        # This assumes upsert doesn't reliably return the data in Supabase v1
        if response.data:
            logger.info(f"Upsert response data: {response.data}") # Log raw response
            # Try to refetch to get the full current state
            fetched_interaction = await get_interaction_by_user_wine(user_id, wine_id, client)
            return fetched_interaction
        else:
             # Even if response.data is empty, the upsert might have succeeded.
             # Refetch the interaction to confirm and return its state.
            logger.warning("Upsert response data empty, refetching...")
            fetched_interaction = await get_interaction_by_user_wine(user_id, wine_id, client)
            if fetched_interaction:
                logger.info("Refetch successful after upsert.")
                return fetched_interaction
            else:
                 logger.error("Upsert reported success but failed to refetch interaction.")
                 return None

    except APIError as e:
        logger.error(f"Error upserting interaction for user {user_id}, wine {wine_id}: {e}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error during interaction upsert: {e}")
        return None
