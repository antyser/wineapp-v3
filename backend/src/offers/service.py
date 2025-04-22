from typing import Dict, List, Optional

from loguru import logger
from supabase import Client

from src.core.supabase import get_supabase_client
from src.crawler.wine_searcher import WineSearcherOffer


async def get_offers(
    wine_id: str, client: Optional[Client] = None
) -> List[WineSearcherOffer]:
    """
    Retrieve offers for a specific wine from the Supabase offers table.

    Args:
        wine_id: ID of the wine in the wine_searcher_wines table
        client: Optional Supabase client (will use default if not provided)

    Returns:
        List of WineSearcherOffer objects representing available offers for the wine
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Query the offers table for entries matching the wine_id
        response = client.table("offers").select("*").eq("wine_id", wine_id).execute()

        if not response.data:
            logger.info(f"No offers found for wine ID: {wine_id}")
            return []

        # Convert raw data to WineSearcherOffer objects
        offers = []
        for offer_data in response.data:
            try:
                offer = WineSearcherOffer.model_validate(offer_data)
                offers.append(offer)
            except Exception as e:
                logger.warning(f"Error parsing offer data: {e}")
                continue

        logger.info(f"Found {len(offers)} offers for wine ID: {wine_id}")
        return offers

    except Exception as e:
        logger.error(f"Error retrieving offers for wine ID {wine_id}: {e}")
        return []