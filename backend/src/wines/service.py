from datetime import datetime
from typing import Dict, List, Optional, Union
from uuid import UUID, uuid4

from supabase import Client

from ..core import get_supabase_client
from .schemas import Wine, WineCreate, WineSearchParams, WineUpdate


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
        "total": total
    }


async def get_wine(
    wine_id: UUID, 
    client: Optional[Client] = None
) -> Optional[Wine]:
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


async def create_wine(
    wine: WineCreate, 
    client: Optional[Client] = None
) -> Wine:
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
        
    wine_data = wine.model_dump()
    
    # Add generated fields
    now = datetime.utcnow()
    wine_data.update({
        "id": str(uuid4()),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    })
    
    response = client.table("wines").insert(wine_data).execute()
    
    return Wine.model_validate(response.data[0])


async def update_wine(
    wine_id: UUID, 
    wine: WineUpdate, 
    client: Optional[Client] = None
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
    wine_data["updated_at"] = datetime.utcnow().isoformat()
    
    response = (
        client.table("wines")
        .update(wine_data)
        .eq("id", str(wine_id))
        .execute()
    )
    
    if not response.data:
        # For testing, try to get the wine again to see if update worked
        updated = await get_wine(wine_id, client)
        if updated:
            return updated
        return None
        
    return Wine.model_validate(response.data[0])


async def delete_wine(
    wine_id: UUID, 
    client: Optional[Client] = None
) -> bool:
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
    response = (
        client.table("wines")
        .delete()
        .eq("id", str(wine_id))
        .execute()
    )
    
    if not response.data:
        # For testing, check if wine still exists
        updated = await get_wine(wine_id, client)
        return updated is None
        
    return True 