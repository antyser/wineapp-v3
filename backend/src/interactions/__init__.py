# Interactions module
# Handles user interactions with wines including likes, wishlist, ratings, and tasted status

from src.interactions.router import router as interaction_router
from src.interactions.service import (
    get_interaction_by_user_wine,
    upsert_interaction
)

__all__ = [
    "interaction_router",
    "get_interaction_by_user_wine",
    "upsert_interaction",
]
 