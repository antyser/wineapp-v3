import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from postgrest import APIError
from supabase import Client

from src.cellar.schemas import (
    Cellar,
    CellarCreate,
    CellarListParams,
    CellarListResult,
    CellarStatistics,
    CellarUpdate,
    CellarWine,
    CellarWineCreate,
    CellarWineListParams,
    CellarWineListResult,
    CellarWineResponse,
    CellarWineUpdate,
)
from src.core import get_supabase_client


async def get_cellars(
    params: Optional[CellarListParams] = None,
    client: Optional[Client] = None,
) -> CellarListResult:
    """
    Get cellars with optional filtering by user ID

    Args:
        params: Listing parameters
        client: Supabase client (optional, will use default if not provided)

    Returns:
        CellarListResult with items (list of cellars) and total count
    """
    if client is None:
        client = get_supabase_client()

    if params is None:
        params = CellarListParams()

    # Start building query
    query = client.table("cellars").select("*")

    # Filter by user_id if provided
    if params.user_id:
        query = query.eq("user_id", str(params.user_id))

    # Count total before applying pagination
    count_query = query
    count_response = count_query.execute()
    total = len(count_response.data)

    # Apply pagination
    query = query.order("created_at", desc=True)
    query = query.range(params.offset, params.offset + params.limit - 1)

    response = query.execute()

    # Parse sections JSONB array into Python list
    parsed_cellars = []
    for cellar_data in response.data:
        # Handle sections which is stored as JSONB but we want as List[str]
        if cellar_data.get("sections") and isinstance(cellar_data["sections"], str):
            try:
                cellar_data["sections"] = json.loads(cellar_data["sections"])
            except json.JSONDecodeError:
                # If JSON parsing fails, set to None
                cellar_data["sections"] = None

        parsed_cellars.append(Cellar.model_validate(cellar_data))

    return CellarListResult(items=parsed_cellars, total=total)


async def get_cellar(
    cellar_id: UUID, client: Optional[Client] = None
) -> Optional[Cellar]:
    """
    Get a cellar by ID

    Args:
        cellar_id: UUID of the cellar
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Cellar if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    response = client.table("cellars").select("*").eq("id", str(cellar_id)).execute()

    if not response.data:
        return None

    cellar_data = response.data[0]

    # Handle JSONB sections field
    if cellar_data.get("sections") and isinstance(cellar_data["sections"], str):
        try:
            cellar_data["sections"] = json.loads(cellar_data["sections"])
        except json.JSONDecodeError:
            # If JSON parsing fails, set to None
            cellar_data["sections"] = None

    return Cellar.model_validate(cellar_data)


async def create_cellar(
    cellar: CellarCreate, client: Optional[Client] = None
) -> Cellar:
    """
    Create a new cellar

    Args:
        cellar: Cellar data to create
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Created cellar
    """
    if client is None:
        client = get_supabase_client()

    # Convert to dict
    cellar_data = cellar.model_dump()

    # Convert sections to JSONB
    if cellar_data.get("sections"):
        cellar_data["sections"] = json.dumps(cellar_data["sections"])

    # Add generated fields
    now = datetime.now().isoformat()
    cellar_data.update(
        {
            "id": str(uuid4()),
            "created_at": now,
            "updated_at": now,
        }
    )

    response = client.table("cellars").insert(cellar_data).execute()

    created_data = response.data[0]

    # Parse sections back from JSONB
    if created_data.get("sections") and isinstance(created_data["sections"], str):
        try:
            created_data["sections"] = json.loads(created_data["sections"])
        except json.JSONDecodeError:
            created_data["sections"] = None

    return Cellar.model_validate(created_data)


async def update_cellar(
    cellar_id: UUID, cellar: CellarUpdate, client: Optional[Client] = None
) -> Optional[Cellar]:
    """
    Update a cellar

    Args:
        cellar_id: UUID of the cellar to update
        cellar: Cellar data to update
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Updated cellar if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # First check if cellar exists
    existing = await get_cellar(cellar_id, client)
    if not existing:
        return None

    # Update cellar
    cellar_data = cellar.model_dump(exclude_unset=True)

    # Convert sections to JSONB if provided
    if cellar_data.get("sections"):
        cellar_data["sections"] = json.dumps(cellar_data["sections"])

    cellar_data["updated_at"] = datetime.now().isoformat()

    response = (
        client.table("cellars").update(cellar_data).eq("id", str(cellar_id)).execute()
    )

    if not response.data:
        # Try to get the cellar again to see if update worked
        updated = await get_cellar(cellar_id, client)
        if updated:
            return updated
        return None

    updated_data = response.data[0]

    # Parse sections back from JSONB
    if updated_data.get("sections") and isinstance(updated_data["sections"], str):
        try:
            updated_data["sections"] = json.loads(updated_data["sections"])
        except json.JSONDecodeError:
            updated_data["sections"] = None

    return Cellar.model_validate(updated_data)


async def delete_cellar(cellar_id: UUID, client: Optional[Client] = None) -> bool:
    """
    Delete a cellar

    Args:
        cellar_id: UUID of the cellar to delete
        client: Supabase client (optional, will use default if not provided)

    Returns:
        True if deleted, False if not found
    """
    if client is None:
        client = get_supabase_client()

    # First check if cellar exists
    existing = await get_cellar(cellar_id, client)
    if not existing:
        return False

    # Delete cellar (cascades to cellar_wines due to FK constraint)
    response = client.table("cellars").delete().eq("id", str(cellar_id)).execute()

    return len(response.data) > 0


# Cellar Wine operations


async def get_cellar_wines(
    params: CellarWineListParams,
    client: Optional[Client] = None,
) -> CellarWineListResult:
    """
    Get wines in a cellar with optional filtering

    Args:
        params: Listing parameters
        client: Supabase client (optional, will use default if not provided)

    Returns:
        CellarWineListResult with items (list of cellar wines with wine details) and total count
    """
    if client is None:
        client = get_supabase_client()

    # Start with a join query to get cellar_wines with wine details
    query = (
        client.table("cellar_wines")
        .select("*, wines(*)")
        .eq("cellar_id", str(params.cellar_id))
    )

    # Apply filters
    if params.section:
        query = query.eq("section", params.section)

    if params.status:
        query = query.eq("status", params.status)

    # For query filtering, we need a more complex approach since we're filtering on joined wine table
    # In a real app with proper Supabase setup, we'd use stored procedures or custom SQL
    # For now, we'll do the filtering in Python after fetching the results

    # Execute the query
    response = query.execute()

    # Filter results by wine name/etc. if query param is provided
    filtered_results = response.data
    if params.query:
        query_lower = params.query.lower()
        filtered_results = []

        for item in response.data:
            wine = item.get("wines", {})
            # Check if the wine matches the query
            if (
                (wine.get("name") and query_lower in wine.get("name", "").lower())
                or (
                    wine.get("winery") and query_lower in wine.get("winery", "").lower()
                )
                or (
                    wine.get("varietal")
                    and query_lower in wine.get("varietal", "").lower()
                )
                or (
                    wine.get("region") and query_lower in wine.get("region", "").lower()
                )
            ):
                filtered_results.append(item)

    # Get total count
    total = len(filtered_results)

    # Sort results
    # Default sort is by created_at desc
    if params.sort_by:
        # Since we need to handle nested wine fields, do sorting in Python
        reverse = params.sort_desc

        if params.sort_by.startswith("wine."):
            # Sorting by a wine field
            wine_field = params.sort_by[5:]  # Remove "wine." prefix
            filtered_results.sort(
                key=lambda x: x.get("wines", {}).get(wine_field, ""), reverse=reverse
            )
        else:
            # Sorting by a cellar_wine field
            filtered_results.sort(
                key=lambda x: x.get(params.sort_by, ""), reverse=reverse
            )

    # Apply pagination
    start = params.offset
    end = params.offset + params.limit
    paginated_results = filtered_results[start:end]

    # Format results
    result_items = []
    for item in paginated_results:
        wine_data = item.pop("wines", {})
        cellar_wine = CellarWine.model_validate(item)
        result_items.append(
            CellarWineResponse(**cellar_wine.model_dump(), wine=wine_data)
        )

    return CellarWineListResult(items=result_items, total=total)


async def get_cellar_wine(
    cellar_wine_id: UUID, client: Optional[Client] = None
) -> Optional[CellarWineResponse]:
    """
    Get a cellar wine by ID with wine details

    Args:
        cellar_wine_id: UUID of the cellar wine
        client: Supabase client (optional, will use default if not provided)

    Returns:
        CellarWineResponse if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    response = (
        client.table("cellar_wines")
        .select("*, wines(*)")
        .eq("id", str(cellar_wine_id))
        .execute()
    )

    if not response.data:
        return None

    item = response.data[0]
    wine_data = item.pop("wines", {})
    cellar_wine = CellarWine.model_validate(item)

    return CellarWineResponse(**cellar_wine.model_dump(), wine=wine_data)


async def add_wine_to_cellar(
    cellar_wine: CellarWineCreate, client: Optional[Client] = None
) -> Optional[CellarWineResponse]:
    """
    Add a wine to a cellar

    Args:
        cellar_wine: Details about the wine to add
        client: Supabase client (optional, will use default if not provided)

    Returns:
        CellarWineResponse if added successfully, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # First check if cellar exists
    cellar = await get_cellar(cellar_wine.cellar_id, client)
    if not cellar:
        return None

    # Then check if wine exists
    wine_service = importlib.import_module("src.wines.service")
    wine = await wine_service.get_wine(cellar_wine.wine_id, client)
    if not wine:
        return None

    # Add wine to cellar
    cellar_wine_data = cellar_wine.model_dump()

    # Add generated fields
    now = datetime.now().isoformat()
    cellar_wine_data.update(
        {
            "id": str(uuid4()),
            "created_at": now,
            "updated_at": now,
        }
    )

    # Convert UUID fields to strings for Supabase
    for field in ["cellar_id", "wine_id"]:
        if isinstance(cellar_wine_data.get(field), UUID):
            cellar_wine_data[field] = str(cellar_wine_data[field])

    # Convert purchase_date to ISO format string if it exists
    if cellar_wine_data.get("purchase_date") and hasattr(
        cellar_wine_data["purchase_date"], "isoformat"
    ):
        cellar_wine_data["purchase_date"] = cellar_wine_data[
            "purchase_date"
        ].isoformat()

    # Insert the cellar wine
    response = client.table("cellar_wines").insert(cellar_wine_data).execute()

    if not response.data:
        return None

    # Get the created cellar wine with wine details
    cellar_wine_id = response.data[0]["id"]
    return await get_cellar_wine(UUID(cellar_wine_id), client)


async def update_cellar_wine(
    cellar_wine_id: UUID, cellar_wine: CellarWineUpdate, client: Optional[Client] = None
) -> Optional[CellarWineResponse]:
    """
    Update a cellar wine

    Args:
        cellar_wine_id: UUID of the cellar wine to update
        cellar_wine: Cellar wine data to update
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Updated cellar wine with wine details if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    # First check if cellar wine exists
    existing = await get_cellar_wine(cellar_wine_id, client)
    if not existing:
        return None

    # Update cellar wine
    cellar_wine_data = cellar_wine.model_dump(exclude_unset=True)
    cellar_wine_data["updated_at"] = datetime.now().isoformat()

    # Execute the update
    client.table("cellar_wines").update(cellar_wine_data).eq(
        "id", str(cellar_wine_id)
    ).execute()

    # Get the updated cellar wine with wine details
    return await get_cellar_wine(cellar_wine_id, client)


async def remove_wine_from_cellar(
    cellar_wine_id: UUID, client: Optional[Client] = None
) -> bool:
    """
    Remove a wine from a cellar

    Args:
        cellar_wine_id: UUID of the cellar wine to remove
        client: Supabase client (optional, will use default if not provided)

    Returns:
        True if removed, False if not found
    """
    if client is None:
        client = get_supabase_client()

    # First check if cellar wine exists
    existing = await get_cellar_wine(cellar_wine_id, client)
    if not existing:
        return False

    # Delete cellar wine
    response = (
        client.table("cellar_wines").delete().eq("id", str(cellar_wine_id)).execute()
    )

    return len(response.data) > 0


async def get_cellar_statistics(
    cellar_id: UUID, client: Optional[Client] = None
) -> CellarStatistics:
    """
    Get statistics for a cellar

    Args:
        cellar_id: UUID of the cellar
        client: Supabase client (optional, will use default if not provided)

    Returns:
        Cellar statistics
    """
    if client is None:
        client = get_supabase_client()

    # Get all wines in the cellar
    response = (
        client.table("cellar_wines")
        .select("*, wines(*)")
        .eq("cellar_id", str(cellar_id))
        .eq("status", "in_stock")  # Only count wines that are in stock
        .execute()
    )

    if not response.data:
        # Empty cellar
        return CellarStatistics(
            total_bottles=0,
            total_value=0.0,
            bottles_by_type={},
            bottles_by_region={},
            bottles_by_vintage={},
        )

    # Calculate statistics
    total_bottles = 0
    total_value = 0.0
    bottles_by_type = {}
    bottles_by_region = {}
    bottles_by_vintage = {}

    for item in response.data:
        quantity = item.get("quantity", 1)
        total_bottles += quantity

        # Add purchase price to total value
        purchase_price = item.get("purchase_price")
        if purchase_price is not None:
            total_value += purchase_price * quantity

        wine = item.get("wines", {})

        # Count bottles by wine type
        wine_type = wine.get("type")
        if wine_type:
            bottles_by_type[wine_type] = bottles_by_type.get(wine_type, 0) + quantity

        # Count bottles by region
        region = wine.get("region")
        if region:
            bottles_by_region[region] = bottles_by_region.get(region, 0) + quantity

        # Count bottles by vintage
        vintage = wine.get("vintage")
        if vintage:
            bottles_by_vintage[str(vintage)] = (
                bottles_by_vintage.get(str(vintage), 0) + quantity
            )

    return CellarStatistics(
        total_bottles=total_bottles,
        total_value=total_value,
        bottles_by_type=bottles_by_type,
        bottles_by_region=bottles_by_region,
        bottles_by_vintage=bottles_by_vintage,
    )


async def get_cellar_wines_by_user_wine(
    user_id: UUID, wine_id: UUID, client: Optional[Client] = None
) -> List[dict]:
    """
    Get all cellar wines for a specific user and wine.

    Args:
        user_id: UUID of the user
        wine_id: UUID of the wine
        client: Optional Supabase client (will use default if not provided)

    Returns:
        List of cellar wines (with cellar info) if found, empty list otherwise
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Use a single query with a join to get cellar wines for this user and wine
        cellar_wines_response = (
            client.table("cellar_wines")
            .select("*, cellars(id, name, sections)")
            .eq("wine_id", str(wine_id))
            .filter("cellars.user_id", "eq", str(user_id))
            .execute()
        )

        return cellar_wines_response.data if cellar_wines_response.data else []

    except APIError as e:
        # Log the error here if needed
        return []
