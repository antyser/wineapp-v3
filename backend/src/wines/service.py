from datetime import datetime
from typing import Dict, List, Optional, Union
from uuid import UUID, uuid4

from loguru import logger

from src.core import get_supabase_client
from src.wines.schemas import Wine, WineCreate, WineSearchParams, WineUpdate
from supabase import Client


def _serialize_uuid(obj):
    """Helper function to convert UUID objects to strings and dates to ISO format"""
    if isinstance(obj, dict):
        return {k: _serialize_uuid(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_serialize_uuid(i) for i in obj]
    elif isinstance(obj, UUID):
        return str(obj)
    elif hasattr(obj, "isoformat"):
        # Handle date and datetime objects
        return obj.isoformat()
    else:
        return obj


async def get_wines(
    params: Optional[WineSearchParams] = None,
    client: Optional[Client] = None,
) -> Dict[str, Union[List[Wine], int]]:
    """
    Get wines with optional filtering

    Args:
        params: Search parameters
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Dictionary with items (list of wines) and total count
    """
    if client is None:
        client = get_supabase_client()

    if params is None:
        params = WineSearchParams()

    # Start building query
    query = client.table("wines").select("*")

    # Apply filters if provided
    if params.query:
        # Simple search across multiple fields
        # In a real app, we'd use FTS or a more sophisticated search
        query = query.or_(
            f"name.ilike.%{params.query}%,"
            f"winery.ilike.%{params.query}%,"
            f"region.ilike.%{params.query}%,"
            f"varietal.ilike.%{params.query}%,"
            f"notes.ilike.%{params.query}%"
        )

    if params.region:
        query = query.ilike("region", f"%{params.region}%")

    if params.country:
        query = query.ilike("country", f"%{params.country}%")

    if params.varietal:
        query = query.ilike("varietal", f"%{params.varietal}%")

    if params.type:
        query = query.eq("type", params.type)

    if params.min_price is not None:
        query = query.gte("price", params.min_price)

    if params.max_price is not None:
        query = query.lte("price", params.max_price)

    if params.min_rating is not None:
        query = query.gte("rating", params.min_rating)

    if params.min_vintage is not None:
        query = query.gte("vintage", params.min_vintage)

    if params.max_vintage is not None:
        query = query.lte("vintage", params.max_vintage)

    # Count total before applying pagination
    count_query = query
    count_response = count_query.execute()
    total = len(count_response.data)

    # Apply pagination
    query = query.order("created_at", desc=True)
    query = query.range(params.offset, params.offset + params.limit - 1)

    response = query.execute()

    return {
        "items": [Wine.model_validate(item) for item in response.data],
        "total": total,
    }


async def get_wine(wine_id: UUID, client: Optional[Client] = None) -> Optional[Wine]:
    """
    Get a wine by ID

    Args:
        wine_id: UUID of the wine
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Wine if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    response = client.table("wines").select("*").eq("id", str(wine_id)).execute()

    if not response.data:
        return None

    # Print response for debugging
    print(f"get_wine response: {response.data}")

    return Wine.model_validate(response.data[0])


async def create_wine(wine: WineCreate, client: Optional[Client] = None) -> Wine:
    """
    Create a new wine

    Args:
        wine: Wine data to create
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Created wine
    """
    if client is None:
        client = get_supabase_client()

    wine_data = _serialize_uuid(wine.model_dump())

    # Add generated fields
    now = datetime.now().isoformat()
    wine_data.update(
        {
            "id": str(uuid4()),
            "created_at": now,
            "updated_at": now,
        }
    )

    response = client.table("wines").insert(wine_data).execute()

    return Wine.model_validate(response.data[0])


async def update_wine(
    wine_id: UUID, wine: WineUpdate, client: Optional[Client] = None
) -> Optional[Wine]:
    """
    Update a wine

    Args:
        wine_id: UUID of the wine to update
        wine: Wine data to update
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Updated wine if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # First check if wine exists
    existing = await get_wine(wine_id, client)
    if not existing:
        return None

    # Update wine
    wine_data = _serialize_uuid(wine.model_dump(exclude_unset=True))
    wine_data["updated_at"] = datetime.now().isoformat()

    response = client.table("wines").update(wine_data).eq("id", str(wine_id)).execute()

    if not response.data:
        # For testing, try to get the wine again to see if update worked
        updated = await get_wine(wine_id, client)
        if updated:
            return updated
        return None

    return Wine.model_validate(response.data[0])


async def delete_wine(wine_id: UUID, client: Optional[Client] = None) -> bool:
    """
    Delete a wine

    Args:
        wine_id: UUID of the wine to delete
        client: Supabase client (optional, will use default if not provided)

    Returns:
        True if deleted, False if not found
    """
    if client is None:
        client = get_supabase_client()

    # First check if wine exists
    existing = await get_wine(wine_id, client)
    if not existing:
        return False

    # Delete wine
    response = client.table("wines").delete().eq("id", str(wine_id)).execute()

    if not response.data:
        # For testing, check if wine still exists
        updated = await get_wine(wine_id, client)
        return updated is None

    return True


async def fetch_wine_from_wine_searcher(
    search_term: str, vintage: Optional[int] = None, use_crawler: bool = True
) -> Optional[Wine]:
    """
    Fetch wine information from Wine-Searcher.com.

    Args:
        search_term: Wine name to search for
        vintage: Optional vintage to filter results
        use_crawler: Whether to use a third-party crawler (default: True)

    Returns:
        Wine object if found, None otherwise
    """
    try:
        # Import here to avoid circular imports
        from src.crawler.wine_searcher import fetch_wine

        logger.info(f"Fetching wine from Wine-Searcher: {search_term}")

        # Use the wine searcher to fetch the wine
        wine_searcher = await fetch_wine(
            wine_name=search_term,
            vintage=vintage,
            country="usa",
            use_crawler=use_crawler,
        )

        # Return None if wine not found
        if not wine_searcher:
            logger.warning(f"Wine not found on Wine-Searcher: {search_term}")
            return None

        # Convert WineSearcherWine to Wine
        wine = convert_wine_searcher_to_wine(wine_searcher)

        logger.info(f"Found wine from Wine-Searcher: {wine.name} ({wine.vintage})")
        return wine
    except Exception as e:
        logger.error(f"Error fetching wine from Wine-Searcher: {str(e)}")
        return None


def convert_wine_searcher_to_wine(wine_searcher: "WineSearcherWine") -> Wine:
    """
    Convert WineSearcherWine to Wine.

    Args:
        wine_searcher: WineSearcherWine object

    Returns:
        Wine object
    """
    return Wine(
        id=wine_searcher.id,
        name=wine_searcher.name,
        region=wine_searcher.region,
        country=wine_searcher.origin,
        producer=wine_searcher.producer,
        vintage=str(wine_searcher.vintage),
        wine_type=wine_searcher.wine_type,
        grape_variety=wine_searcher.grape_variety,
        image_url=wine_searcher.image,
        average_price=wine_searcher.average_price,
        description=wine_searcher.description,
        wine_searcher_id=(
            str(wine_searcher.wine_searcher_id)
            if wine_searcher.wine_searcher_id
            else None
        ),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
