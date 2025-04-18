# Interactions module
# Handles user interactions with wines including likes, wishlist, ratings, and tasted status

from src.interactions.router import router as interaction_router
from src.interactions.service import (
    create_interaction,
    delete_interaction,
    get_interaction,
    get_interaction_by_user_wine,
    get_interactions_by_user,
    get_interactions_by_wine,
    update_interaction,
)

__all__ = [
    "interaction_router",
    "create_interaction",
    "get_interaction",
    "get_interaction_by_user_wine",
    "get_interactions_by_user",
    "get_interactions_by_wine",
    "update_interaction",
    "delete_interaction",
]
 