import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from loguru import logger
from supabase import Client

from src.ai.extract_wine_agent import extract_wines
from src.core import get_supabase_client
from src.search.schemas import SearchHistory, SearchHistoryCreate

# Avoid circular import
# Don't import Wine model directly - use Dict, Any to annotate the returns
# from src.wines.schemas import Wine
# from src.wines.service import search_wine


# AI Search Functions


async def ai_search_wines(
    text_input: Optional[str] = None,
    image_content: Optional[bytes] = None,
) -> List[Dict[str, Any]]:
    """
    Ask LLM to extract wine information from text or image, then search.

    This function first extracts potential wine names/vintages using an AI agent.
    Then, for each potential wine, it calls `search_wine` (imported locally
    within this function) to find or create the wine record in the database,
    potentially involving Wine-Searcher lookups.

    Args:
        text_input (Optional[str]): Text input to extract wine information from.
        image_content (Optional[bytes]): Image content to extract wine information from.

    Returns:
        List[Dict[str, Any]]: List of wine objects (as dicts) found or created.
    """
    # Import here to avoid circular import at module level
    from src.wines.service import search_wine

    wine_result = await extract_wines(text_input, image_content)
    ai_wines = wine_result.wines

    client = get_supabase_client()

    # Use gather to perform searches in parallel for better performance
    search_tasks = [
        search_wine(ai_wine.name, ai_wine.vintage, client) for ai_wine in ai_wines
    ]

    found_wines_models = await asyncio.gather(*search_tasks)

    # Filter out any None values and convert models to dictionaries
    # We return dicts to avoid needing the Wine model import here
    found_wines = [wine.model_dump() for wine in found_wines_models if wine is not None]
    return found_wines
