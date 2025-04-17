import asyncio
from typing import List, Optional
from uuid import UUID

from postgrest import APIError
from supabase import Client

from src.core import get_supabase_client
from src.interactions.schemas import InteractionCreate, InteractionUpdate


async def create_interaction(interaction: InteractionCreate):
    """Create a new interaction"""
    try:
        supabase = get_supabase_client()
        response = (
            await supabase.table("interactions").insert(interaction.dict()).execute()
        )
        return response.data[0]
    except APIError as e:
        # Check if it's a unique violation (user already has an interaction with this wine)
        if "unique constraint" in str(e):
            # Update the existing interaction instead
            existing = await get_interaction_by_user_wine(
                interaction.user_id, interaction.wine_id
            )
            if existing:
                return await update_interaction(
                    existing["id"], InteractionUpdate(**interaction.dict())
                )
        raise


async def get_interaction(interaction_id: UUID):
    """Get an interaction by ID"""
    supabase = get_supabase_client()
    response = (
        await supabase.table("interactions")
        .select("*")
        .eq("id", str(interaction_id))
        .execute()
    )
    return response.data[0] if response.data else None


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
        response = (
            client.table("interactions")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("wine_id", str(wine_id))
            .execute()
        )

        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except APIError as e:
        # Check if it's a unique violation (user already has an interaction with this wine)
        if "unique constraint" in str(e):
            return None
        # Re-raise other errors
        raise


async def get_interactions_by_user(user_id: UUID):
    """Get all interactions for a user"""
    supabase = get_supabase_client()
    response = (
        await supabase.table("interactions")
        .select("*")
        .eq("user_id", str(user_id))
        .execute()
    )
    return response.data


async def get_interactions_by_wine(wine_id: UUID):
    """Get all interactions for a wine"""
    supabase = get_supabase_client()
    response = (
        await supabase.table("interactions")
        .select("*")
        .eq("wine_id", str(wine_id))
        .execute()
    )
    return response.data


async def update_interaction(interaction_id: UUID, interaction: InteractionUpdate):
    """Update an interaction"""
    supabase = get_supabase_client()
    response = (
        await supabase.table("interactions")
        .update(interaction.dict(exclude_unset=True))
        .eq("id", str(interaction_id))
        .execute()
    )
    return response.data[0] if response.data else None


async def delete_interaction(interaction_id: UUID):
    """Delete an interaction"""
    supabase = get_supabase_client()
    response = (
        await supabase.table("interactions")
        .delete()
        .eq("id", str(interaction_id))
        .execute()
    )
    return response.data[0] if response.data else None
