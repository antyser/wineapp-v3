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
from src.crawler.wine_searcher import WineSearcherOffer, WineSearcherWine, fetch_wine
from src.wines.schemas import Wine, WineCreate, WineSearchParams, WineUpdate
from supabase import Client


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
            f"tasting_notes.ilike.%{params.query}%"
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

    wine_data = wine.model_dump()

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
    wine_data = wine.model_dump(exclude_unset=True)
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
    search_term: str, vintage: Optional[int] = None
) -> Optional[Wine]:
    """
    Fetch wine information from Wine-Searcher.com.

    Args:
        search_term: Wine name to search for
        vintage: Optional vintage to filter results

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
        )

        # Return None if wine not found
        if not wine_searcher:
            logger.warning(f"Wine not found on Wine-Searcher: {search_term}")
            return None

        # Save the WineSearcherWine to the database
        await save_wine_searcher(wine_searcher)
        logger.info(f"Saved wine to wine_searcher_wines table: {wine_searcher.name}")

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
    logger.info(f"image_url: {wine_searcher.image}")
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
        wine_searcher_url=wine_searcher.url,
        created_at=now,
        updated_at=now,
    )


async def search_wine_from_db(
    wine_name: str, vintage: Optional[int] = None, client: Optional[Client] = None
) -> Optional[Wine]:
    """
    Search for wines in the database by name or name alias with multiple matching strategies.

    Checks:
    1. Exact name match
    2. Name alias array contains the search term
    3. Name contains the search term as a substring

    Args:
        wine_name: The name to search for
        vintage: Optional vintage year to filter by
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Wine object if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # Start building the query
    query = client.table("wines").select("*")

    # Add vintage filter if provided
    if vintage is not None:
        query = query.eq("vintage", str(vintage))

    # Combined query approach:
    # - Direct name match (exact equality)
    # - name_alias array contains the search term
    # - Partial name match (name contains search term)

    # Construct the OR query for all matching strategies
    query = query.or_(
        f"name.eq.{wine_name},"
        + f"name.ilike.%{wine_name}%,"
        + f"name_alias.cs.{{{wine_name}}}"  # Check if name_alias array contains this value
    )

    # Execute the query
    response = query.execute()

    logger.info(
        f"Wine search query for '{wine_name}', results: {len(response.data or [])}"
    )

    if response.data and len(response.data) > 0:
        # Prioritize exact name matches first, then alias matches, then partial matches
        # Sort results to prefer exact matches
        sorted_results = sorted(
            response.data,
            key=lambda x: (
                0
                if x.get("name") == wine_name  # Exact match gets highest priority
                else (
                    1
                    if x.get("name_alias")
                    and wine_name in (x.get("name_alias") or [])  # Alias match is next
                    else 2
                )
            ),  # Partial match gets lowest priority
        )

        return Wine.model_validate(sorted_results[0])

    return None


async def search_wine(
    wine_name: str, vintage: Optional[int] = None, client: Optional[Client] = None
) -> Optional[Wine]:
    """
    Search for a wine by name and vintage using the following strategy:
    1. Look for matching wine in wines table (including name_alias field)
    2. Look for matching wine in wine_searcher_wines table
    3. Fetch from Wine-Searcher if not found in either table

    Args:
        wine_name: Name of the wine to search for
        vintage: Optional vintage to filter by
        client: Supabase client (optional)

    Returns:
        Wine object if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # First check if we already have this wine in our regular wines table
    db_wine = await search_wine_from_db(
        wine_name=wine_name, vintage=vintage, client=client
    )

    if db_wine:
        return db_wine

    # Then check if we have it in wine_searcher_wines table
    wine_searcher_db = await get_wine_searcher_by_name(wine_name)

    if wine_searcher_db and (vintage is None or wine_searcher_db.vintage == vintage):
        # We found it in wine_searcher_wines table, now create/update in wines table
        wine_model = convert_wine_searcher_to_wine(wine_searcher_db)

        # Check if a wine with the same wine_searcher_id exists in our database
        existing_wine = None
        if wine_searcher_db.id:
            existing_query = (
                client.table("wines")
                .select("*")
                .eq("wine_searcher_id", wine_searcher_db.id)
            )
            existing_response = existing_query.execute()
            if existing_response.data and len(existing_response.data) > 0:
                existing_wine = Wine.model_validate(existing_response.data[0])

                # If the wine exists but has a different name, add the current name to name_alias
                if existing_wine.name != wine_name:
                    name_alias = existing_wine.name_alias or []
                    if wine_name not in name_alias:
                        name_alias.append(wine_name)
                        # Update the existing wine with the new alias
                        await update_wine(
                            existing_wine.id, WineUpdate(name_alias=name_alias), client
                        )
                return existing_wine

        # If wine doesn't exist yet, create it
        wine_db = await create_wine(
            WineCreate.model_validate(wine_model.model_dump()),
            client,
        )
        return wine_db

    # If not found in either table, fetch from Wine-Searcher
    wine_searcher_wine = await fetch_wine(wine_name=wine_name, vintage=vintage)

    if wine_searcher_wine:
        # Save to wine_searcher_wines table
        await save_wine_searcher(wine_searcher_wine)

        # Then check if we already have a wine with this wine_searcher_id
        existing_query = (
            client.table("wines")
            .select("*")
            .eq("wine_searcher_id", wine_searcher_wine.id)
        )
        existing_response = existing_query.execute()

        if existing_response.data and len(existing_response.data) > 0:
            existing_wine = Wine.model_validate(existing_response.data[0])

            # If the existing wine has a different name than the search term,
            # add the search term to the name_alias
            if existing_wine.name != wine_name:
                name_alias = existing_wine.name_alias or []
                if wine_name not in name_alias:
                    name_alias.append(wine_name)
                    # Update the wine with the new alias
                    await update_wine(
                        existing_wine.id, WineUpdate(name_alias=name_alias), client
                    )
            return existing_wine

        # Otherwise create a new wine
        wine_model = convert_wine_searcher_to_wine(wine_searcher_wine)

        # If the wine_searcher name differs from our search term, add the search term as an alias
        if wine_model.name != wine_name:
            wine_model.name_alias = [wine_name]

        logger.info(f"Wine model: {wine_model.model_dump()}")
        wine_db = await create_wine(
            WineCreate.model_validate(wine_model.model_dump()), client
        )
        return wine_db

    # Create a placeholder wine if nothing was found
    wine_create = WineCreate(
        name=wine_name,
        vintage=vintage,
    )
    new_wine = await create_wine(wine_create, client)
    return new_wine


async def ai_search_wines(
    text_input: Optional[str] = None,
    image_content: Optional[bytes] = None,
) -> List[Wine]:
    """
    Ask LLM to extract wine information from text or image
    look up each wine name in our database via supabase search
    if found, return the wine objects
    if not found, search the wine name on wine-searcher.com and update our database with the new wine
    return the wine objects
    If the wine is not found on wine-searcher.com, but LLM generates wines, create new wines in wine table.

    Args:
        text_input (Optional[str]): Text input to extract wine information from
        image_content (Optional[bytes]): Image content to extract wine information from

    Returns:
        List[Wine]: List of wine objects found or created
    """
    wine_result = await extract_wines(text_input, image_content)
    ai_wines = wine_result.wines

    client = get_supabase_client()

    # Use gather to perform searches in parallel for better performance
    search_tasks = [
        search_wine(ai_wine.name, ai_wine.vintage, client) for ai_wine in ai_wines
    ]

    found_wines = await asyncio.gather(*search_tasks)

    # Filter out any None values (shouldn't happen due to fallback to placeholder creation)
    return [wine for wine in found_wines if wine is not None]


# New functions for handling WineSearcherWine objects


async def save_wine_searcher(wine: WineSearcherWine):
    """
    Save a WineSearcherWine to the wine_searcher_wines table with its offers.

    Args:
        wine: WineSearcherWine object to save

    Returns:
        The saved wine data
    """
    client = get_supabase_client()
    wine_data = wine.model_dump(exclude={"offers"})
    offers = wine.offers or []

    # Save the wine
    wine_result = client.table("wine_searcher_wines").upsert(wine_data).execute()

    # Prepare offers with wine_id
    offer_data = []
    for offer in offers:
        offer_dict = offer.model_dump()
        offer_dict["wine_id"] = wine.id
        offer_data.append(offer_dict)

    if offer_data:
        client.table("offers").upsert(offer_data).execute()

    return wine_result


async def get_wine_searcher(id: str):
    """
    Get a WineSearcherWine by ID

    Args:
        id: ID of the wine

    Returns:
        Wine data
    """
    client = get_supabase_client()
    data = client.table("wine_searcher_wines").select("*").eq("id", id).execute()

    if not data.data:
        return None

    # Get offers for this wine
    offers_data = client.table("offers").select("*").eq("wine_id", id).execute()

    if data.data:
        wine_data = data.data[0]
        wine_data["offers"] = offers_data.data if offers_data.data else []
        return WineSearcherWine.model_validate(wine_data)

    return None


async def get_wine_searcher_by_name(name: str):
    """
    Get a WineSearcherWine by name

    Args:
        name: Name of the wine

    Returns:
        Wine data
    """
    client = get_supabase_client()
    data = client.table("wine_searcher_wines").select("*").eq("name", name).execute()

    if not data.data:
        return None

    # For simplicity, just return the first match without fetching offers
    # In a real implementation, you might want to get offers too
    if data.data:
        return WineSearcherWine.model_validate(data.data[0])

    return None


async def save_wine_searcher_batch(wines: List[WineSearcherWine]):
    """
    Save a batch of WineSearcherWine objects with their offers

    Args:
        wines: List of WineSearcherWine objects

    Returns:
        The saved wine data
    """
    client = get_supabase_client()

    unique_wines = {}
    for wine in wines:
        unique_wines[wine.id] = wine

    wine_data = [wine.model_dump(exclude={"offers"}) for wine in unique_wines.values()]
    offers_data = []

    for wine in unique_wines.values():
        if wine.offers:
            for offer in wine.offers:
                offer_dict = offer.model_dump()
                offer_dict["wine_id"] = wine.id
                offers_data.append(offer_dict)

    # Save wines
    wines_result = client.table("wine_searcher_wines").upsert(wine_data).execute()

    if offers_data:
        client.table("offers").upsert(offers_data).execute()

    return wines_result


if __name__ == "__main__":
    load_dotenv()
    # Load image from Downloads folder
    image_path = os.path.expanduser("~/Downloads/IMG_3775.JPG")
    with open(image_path, "rb") as f:
        image_content = f.read()
    asyncio.run(ai_search_wines(image_content=image_content))
