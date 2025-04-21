# Search module
# Handles search functionality (AI, history) and related APIs

from src.search.router import router as search_history_router
from src.search.history.service import (
    create_search_history_record,
    get_search_history_for_user,
)
from src.search.service import ai_search_wines

__all__ = [
    "search_history_router",
    "ai_search_wines",
    "create_search_history_record",
    "get_search_history_for_user",
]
