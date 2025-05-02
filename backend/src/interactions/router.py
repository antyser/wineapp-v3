from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from src.auth.utils import get_current_user
from src.interactions import service
from src.interactions.schemas import Interaction, InteractionUpdate

router = APIRouter(
    prefix="/interactions",
    tags=["interactions"],
)


@router.post("/user/{wine_id}", response_model=Interaction, status_code=status.HTTP_200_OK)
async def upsert_user_wine_interaction(
    wine_id: UUID,
    payload: InteractionUpdate,
    current_user_id: UUID = Depends(get_current_user),
):
    """
    Upsert (create or update) a user's interaction with a specific wine.
    Requires authentication.
    """
    logger.info(f"Upserting interaction for user {current_user_id} and wine {wine_id}")
    logger.debug(f"Payload: {payload}")

    updated_interaction = await service.upsert_interaction(
        user_id=current_user_id,
        wine_id=wine_id,
        payload=payload
    )

    if not updated_interaction:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save interaction",
        )

    logger.info(f"Successfully upserted interaction: {updated_interaction['id']}")
    return updated_interaction
