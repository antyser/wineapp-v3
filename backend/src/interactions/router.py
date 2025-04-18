from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from src.auth.utils import get_current_user
from src.interactions import service
from src.interactions.schemas import Interaction, InteractionCreate, InteractionUpdate

router = APIRouter(
    prefix="/interactions",
    tags=["interactions"],
)


@router.post("/", response_model=dict)
async def create_interaction(
    interaction: InteractionCreate, current_user=Depends(get_current_user)
):
    """Create a new interaction"""
    # Ensure the user ID matches the authenticated user
    if interaction.user_id != current_user:
        raise HTTPException(status_code=403, detail="User ID mismatch")

    result = await service.create_interaction(interaction)
    return result


@router.get("/{interaction_id}", response_model=dict)
async def get_interaction(interaction_id: UUID, current_user=Depends(get_current_user)):
    """Get an interaction by ID"""
    interaction = await service.get_interaction(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    # Ensure the user has access to this interaction
    if interaction["user_id"] != str(current_user):
        raise HTTPException(
            status_code=403, detail="Not authorized to access this interaction"
        )

    return interaction


@router.get("/user/{user_id}", response_model=List[dict])
async def get_interactions_by_user(
    user_id: UUID, current_user=Depends(get_current_user)
):
    """Get all interactions for a user"""
    # Ensure the user ID matches the authenticated user
    if user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to access these interactions"
        )

    interactions = await service.get_interactions_by_user(user_id)
    return interactions


@router.get("/wine/{wine_id}", response_model=dict)
async def get_interaction_by_wine(
    wine_id: UUID, current_user=Depends(get_current_user)
):
    """Get a user's interaction with a specific wine"""
    interaction = await service.get_interaction_by_user_wine(current_user, wine_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    return interaction


@router.patch("/{interaction_id}", response_model=dict)
async def update_interaction(
    interaction_id: UUID,
    interaction: InteractionUpdate,
    current_user=Depends(get_current_user),
):
    """Update an interaction"""
    existing = await service.get_interaction(interaction_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Interaction not found")

    # Ensure the user has access to this interaction
    if existing["user_id"] != str(current_user):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this interaction"
        )

    result = await service.update_interaction(interaction_id, interaction)
    return result


@router.delete("/{interaction_id}", response_model=dict)
async def delete_interaction(
    interaction_id: UUID, current_user=Depends(get_current_user)
):
    """Delete an interaction"""
    existing = await service.get_interaction(interaction_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Interaction not found")

    # Ensure the user has access to this interaction
    if existing["user_id"] != str(current_user):
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this interaction"
        )

    result = await service.delete_interaction(interaction_id)
    return result


@router.post("/wine/{wine_id}/toggle/{action}", response_model=dict)
async def toggle_interaction(
    wine_id: UUID, action: str, current_user=Depends(get_current_user)
):
    """
    Toggle an interaction property (liked, wishlist, tasted) for a wine

    Args:
        wine_id: ID of the wine
        action: Property to toggle ('liked', 'wishlist', or 'tasted')

    Returns:
        Updated interaction data
    """
    # Validate the action
    if action not in ["liked", "wishlist", "tasted"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid action. Must be one of: liked, wishlist, tasted",
        )

    # Get existing interaction or initialize a new one
    existing = await service.get_interaction_by_user_wine(current_user, wine_id)

    if existing:
        # Toggle the specified property
        update_data = InteractionUpdate(**{action: not existing.get(action, False)})
        result = await service.update_interaction(UUID(existing["id"]), update_data)
    else:
        # Create a new interaction with the specified property set to True
        create_data = InteractionCreate(
            user_id=current_user, wine_id=wine_id, **{action: True}
        )
        result = await service.create_interaction(create_data)

    return result


@router.post("/wine/{wine_id}/rate", response_model=dict)
async def rate_wine(
    wine_id: UUID, rating: float, current_user=Depends(get_current_user)
):
    """
    Rate a wine (on scale of 1-5)

    Args:
        wine_id: ID of the wine
        rating: Rating value (1-5, can be decimal)

    Returns:
        Updated interaction data
    """
    # Validate the rating
    if rating < 0 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")

    # Get existing interaction or initialize a new one
    existing = await service.get_interaction_by_user_wine(current_user, wine_id)

    if existing:
        # Update the rating
        update_data = InteractionUpdate(rating=rating)
        result = await service.update_interaction(UUID(existing["id"]), update_data)
    else:
        # Create a new interaction with the rating
        create_data = InteractionCreate(
            user_id=current_user, wine_id=wine_id, rating=rating
        )
        result = await service.create_interaction(create_data)

    return result
