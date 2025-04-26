from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from loguru import logger

from src.auth.service import delete_user_by_id
from src.auth.utils import get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Current User Account",
    description="Allows the currently authenticated user to delete their own account and associated data.",
)
async def delete_me(
    current_user_id: UUID = Depends(get_current_user),
):
    """
    Delete the currently authenticated user's account.
    """
    logger.info(f"Attempting to delete user account for user_id: {current_user_id}")
    success = await delete_user_by_id(current_user_id)
    if not success:
        logger.error(f"Failed to delete user account for user_id: {current_user_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account.",
        )

    logger.info(f"Successfully deleted user account for user_id: {current_user_id}")
    # Return 204 No Content automatically by FastAPI
    return Response(status_code=status.HTTP_204_NO_CONTENT) 