import asyncio
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union
from uuid import UUID, uuid4

from dotenv import load_dotenv
from loguru import logger

from src.ai.extract_wine_agent import extract_wines
from src.core import get_supabase_client
from src.crawler.wine_searcher import fetch_wine
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
    Create a new wine or update an existing one if wine_searcher_id matches

    Args:
        wine: Wine data to create
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Created or updated wine
    """
    if client is None:
        client = get_supabase_client()

    wine_data = _serialize_uuid(wine.model_dump())

    # Check if wine_searcher_id exists and is not None
    if wine_data.get("wine_searcher_id"):
        # Try to find an existing wine with the same wine_searcher_id
        existing_query = (
            client.table("wines")
            .select("*")
            .eq("wine_searcher_id", wine_data["wine_searcher_id"])
        )
        existing_response = existing_query.execute()

        if existing_response.data and len(existing_response.data) > 0:
            existing_wine = existing_response.data[0]

            # Update the existing wine with new data
            wine_data["updated_at"] = datetime.now().isoformat()
            update_response = (
                client.table("wines")
                .update(wine_data)
                .eq("id", existing_wine["id"])
                .execute()
            )

            if update_response.data:
                return Wine.model_validate(update_response.data[0])
            else:
                # If update response doesn't contain data, fetch and return the wine
                updated_wine = await get_wine(UUID(existing_wine["id"]), client)
                if updated_wine:
                    return updated_wine

    # If no wine_searcher_id match or wine_searcher_id is None, create a new wine
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

        logger.info(f"Found wine from Wine-Searcher: {wine.model_dump()}")
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
    now = datetime.now()  # Get current timestamp for created_at and updated_at

    # Remove vintage from name if present
    name = wine_searcher.name
    if wine_searcher.vintage and str(wine_searcher.vintage) in name:
        name = (
            name.replace(f"{wine_searcher.vintage} ", "")
            .replace(f"{wine_searcher.vintage}", "")
            .strip()
        )

    # Extract country from origin (last part after the last comma)
    country = None
    if wine_searcher.origin and "," in wine_searcher.origin:
        country = wine_searcher.origin.split(",")[-1].strip()
    elif wine_searcher.origin:
        country = wine_searcher.origin.strip()

    return Wine(
        id=uuid.uuid4(),
        name=name,
        region=wine_searcher.region,
        country=country,
        winery=wine_searcher.producer,
        vintage=wine_searcher.vintage,
        type=wine_searcher.wine_type,
        varietal=wine_searcher.grape_variety,
        image_url=wine_searcher.image,
        average_price=wine_searcher.average_price,
        description=wine_searcher.description,
        wine_searcher_id=wine_searcher.id,
        created_at=now,  # Add the required created_at field
        updated_at=now,  # Add the required updated_at field
    )


async def search_wine_from_db(
    wine_name: str, vintage: Optional[int] = None, client: Optional[Client] = None
) -> Optional[Wine]:
    """
    Search for wines in the database using PostgreSQL text search.

    Args:
        wine_name: The name to search for
        vintage: Optional vintage year to filter by
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Wine object if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # First, try to find an exact match (most efficient)
    query = client.table("wines").select("*").eq("name", wine_name)

    # Add vintage filter if provided
    if vintage is not None:
        query = query.eq("vintage", str(vintage))

    # Execute the query for exact match
    response = query.execute()

    # If exact match found, return it
    if response.data and len(response.data) > 0:
        return Wine.model_validate(response.data[0])

    cleaned_text = wine_name.replace("&", " ")
    words = [word for word in cleaned_text.split() if word.strip()]
    search_terms = " & ".join(words)

    # Prepare parameters
    params = {"search_terms": search_terms}
    if vintage is not None:
        params["vintage"] = str(vintage)

    # Execute the raw SQL query
    response = client.rpc(
        "wine_search_ranked",
        {
            "search_terms_param": search_terms,
            "vintage_param": str(vintage) if vintage is not None else None,
            "use_vintage": vintage is not None,
        },
    ).execute()
    logger.info(
        f"Search wine from db, search_terms: {search_terms}, vintage: {vintage}, response: {response}"
    )
    # If we have results and they contain data, process them
    if response and response.data and len(response.data) > 0:
        wines = [Wine.model_validate(wine) for wine in response.data]
        return wines[0] if wines else None
    return None


async def ai_search_wines(
    text_input: Optional[str] = None,
    image_content: Optional[bytes] = None,
) -> List[Wine]:
    """
    ask LLM to extract wine information from text or image
    look up each wine name in our database via supabase search
    if found, return the wine objects
    if not found, search the wine name on wine-searcher.com and update our database with the new wine
    return the wine objects
    If the wine is not found on wine-searcher.com, but LLM generates wines, create new wines in wine table.
    Args:
        text_input (Optional[str], optional): _description_. Defaults to None.
        image_content (Optional[bytes], optional): _description_. Defaults to None.

    Returns:
        List[Wine]: _description_
    """
    wine_result = await extract_wines(text_input, image_content)
    ai_wines = wine_result.wines

    found_wines = []
    client = get_supabase_client()

    for ai_wine in ai_wines:
        db_wine = await search_wine_from_db(
            wine_name=ai_wine.name, vintage=ai_wine.vintage, client=client
        )

        if db_wine:
            found_wines.append(db_wine)
            continue

        wine_searcher_wine = await fetch_wine_from_wine_searcher(
            search_term=ai_wine.name, vintage=ai_wine.vintage
        )

        if wine_searcher_wine:
            # Create or update the wine in the database
            wine_db = await create_wine(
                WineCreate.model_validate(wine_searcher_wine.model_dump()), client
            )
            found_wines.append(wine_db)
        else:
            # Only create new placeholder wine if no wine_searcher match was found
            wine_create = WineCreate(
                name=ai_wine.name,
                vintage=ai_wine.vintage,
            )
            new_wine = await create_wine(wine_create, client)
            found_wines.append(new_wine)
    return found_wines


if __name__ == "__main__":
    load_dotenv()
    # Load image from Downloads folder
    image_path = os.path.expanduser("~/Downloads/IMG_3775.JPG")
    with open(image_path, "rb") as f:
        image_content = f.read()
    asyncio.run(ai_search_wines(image_content=image_content))
