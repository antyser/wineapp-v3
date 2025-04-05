"""
Tests for the wines service module
"""

from uuid import UUID

import pytest
from src.wines.schemas import WineCreate, WineSearchParams, WineUpdate
from src.wines.service import (
    create_wine,
    delete_wine,
    get_wine,
    get_wines,
    search_wine_from_db,
    update_wine,
)


@pytest.mark.asyncio
async def test_get_wines(supabase):
    """
    Test getting all wines
    """
    result = await get_wines(client=supabase)
    assert "items" in result
    assert "total" in result
    assert isinstance(result["items"], list)
    assert isinstance(result["total"], int)
    assert result["total"] >= len(result["items"])
    assert len(result["items"]) > 0  # We should have sample data


@pytest.mark.asyncio
async def test_get_wines_with_params(supabase):
    """
    Test getting wines with search parameters
    """
    # Test filtering by wine type
    params = WineSearchParams(type="Red")
    result = await get_wines(params, client=supabase)
    assert all(wine.type == "Red" for wine in result["items"])

    # Test limiting results
    params = WineSearchParams(limit=2)
    result = await get_wines(params, client=supabase)
    assert len(result["items"]) <= 2

    # Test text search
    params = WineSearchParams(query="Cabernet")
    result = await get_wines(params, client=supabase)
    found = False
    for wine in result["items"]:
        if "Cabernet" in wine.name or (wine.varietal and "Cabernet" in wine.varietal):
            found = True
            break
    assert found


@pytest.mark.asyncio
async def test_get_wine_by_id(supabase):
    """
    Test getting a wine by ID
    """
    # Get a sample wine ID from the list
    all_wines = await get_wines(client=supabase)
    sample_wine = all_wines["items"][0]
    wine_id = sample_wine.id

    # Get the wine by ID
    wine = await get_wine(wine_id, client=supabase)
    assert wine is not None
    assert wine.id == wine_id
    assert wine.name == sample_wine.name


@pytest.mark.asyncio
async def test_get_wine_by_id_not_found(supabase):
    """
    Test getting a wine by ID that doesn't exist
    """
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")
    wine = await get_wine(non_existent_id, client=supabase)
    assert wine is None


@pytest.mark.asyncio
async def test_create_wine(supabase):
    """
    Test creating a new wine
    """
    new_wine = WineCreate(
        name="Test Wine",
        winery="Test Winery",
        vintage=2022,
        region="Test Region",
        country="Test Country",
        varietal="Test Varietal",
        type="Red",
        price=25.99,
        rating=90,
        notes="Test notes",
    )

    created_wine = await create_wine(new_wine, client=supabase)
    assert created_wine is not None
    assert created_wine.name == new_wine.name
    assert created_wine.winery == new_wine.winery
    assert created_wine.vintage == new_wine.vintage
    assert created_wine.id is not None

    # Verify it was actually saved
    retrieved_wine = await get_wine(created_wine.id, client=supabase)
    assert retrieved_wine is not None
    assert retrieved_wine.id == created_wine.id
    assert retrieved_wine.name == new_wine.name


@pytest.mark.asyncio
async def test_update_wine(supabase):
    """
    Test updating a wine
    """
    # Create a wine to update
    new_wine = WineCreate(
        name="Update Test Wine",
        winery="Test Winery",
        vintage=2021,
        region="Test Region",
        country="Test Country",
        varietal="Test Varietal",
        type="White",
        price=19.99,
        rating=88,
        notes="Original notes",
    )
    created_wine = await create_wine(new_wine, client=supabase)

    # Update the wine
    update_data = WineUpdate(
        name="Updated Test Wine",
        notes="Updated notes",
        price=22.99,
    )
    updated_wine = await update_wine(created_wine.id, update_data, client=supabase)

    assert updated_wine is not None
    assert updated_wine.id == created_wine.id
    assert updated_wine.name == update_data.name
    assert updated_wine.notes == update_data.notes
    assert updated_wine.price == update_data.price
    assert updated_wine.vintage == created_wine.vintage  # Unchanged

    # Verify it was actually saved
    retrieved_wine = await get_wine(created_wine.id, client=supabase)
    assert retrieved_wine is not None
    assert retrieved_wine.name == update_data.name
    assert retrieved_wine.notes == update_data.notes


@pytest.mark.asyncio
async def test_update_wine_not_found(supabase):
    """
    Test updating a wine that doesn't exist
    """
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")
    update_data = WineUpdate(name="This won't work")
    updated_wine = await update_wine(non_existent_id, update_data, client=supabase)
    assert updated_wine is None


@pytest.mark.asyncio
async def test_delete_wine(supabase):
    """
    Test deleting a wine
    """
    # Create a wine to delete
    new_wine = WineCreate(
        name="Delete Test Wine",
        winery="Test Winery",
    )
    created_wine = await create_wine(new_wine, client=supabase)

    # Delete the wine
    deleted = await delete_wine(created_wine.id, client=supabase)
    assert deleted is True

    # Verify it was actually deleted
    retrieved_wine = await get_wine(created_wine.id, client=supabase)
    assert retrieved_wine is None


@pytest.mark.asyncio
async def test_delete_wine_not_found(supabase):
    """
    Test deleting a wine that doesn't exist
    """
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")
    deleted = await delete_wine(non_existent_id, client=supabase)
    assert deleted is False


@pytest.mark.asyncio
async def test_search_wine_from_db(supabase):
    """
    Test searching for a wine in the database using text search
    """
    # Create a special test wine with a unique name for testing
    test_wine_name = "TextSearchUniqueTestWine"
    test_vintage = 2018

    new_wine = WineCreate(
        name=test_wine_name,
        winery="Test Winery",
        vintage=test_vintage,
        region="Test Region",
        country="Test Country",
        varietal="Cabernet Sauvignon",
        type="Red",
    )

    # Create another wine with a more complex name for testing text search
    complex_wine_name = "Chateau Lafite Rothschild Premier Grand Cru"
    complex_wine_vintage = 1990

    complex_wine = WineCreate(
        name=complex_wine_name,
        winery="Chateau Lafite Rothschild",
        vintage=complex_wine_vintage,
        region="Pauillac",
        country="France",
        varietal="Bordeaux Blend",
        type="Red",
    )

    # Add the wines to the database
    created_wine = await create_wine(new_wine, client=supabase)
    created_complex_wine = await create_wine(complex_wine, client=supabase)

    try:
        # Test 1: Search by exact name - pass the supabase client explicitly
        result = await search_wine_from_db(test_wine_name, client=supabase)
        assert result is not None
        assert result.name == test_wine_name

        # Test 2: Search with correct vintage
        result = await search_wine_from_db(
            test_wine_name, test_vintage, client=supabase
        )
        assert result is not None
        assert result.name == test_wine_name
        # Vintage could be returned as integer or string, handle both cases
        assert int(result.vintage) == test_vintage

        # Test 3: Search with incorrect vintage
        wrong_vintage = 2020
        result = await search_wine_from_db(
            test_wine_name, wrong_vintage, client=supabase
        )
        assert result is None

        # Test 4: Search for non-existent wine
        result = await search_wine_from_db("NonExistentWine12345", client=supabase)
        assert result is None

        # Test 5: Test text search with partial query
        result = await search_wine_from_db("Lafite Rothschild", client=supabase)
        assert result is not None
        assert "Lafite" in result.name
        assert "Rothschild" in result.name

        # Test 6: Test text search with partial query and vintage
        result = await search_wine_from_db(
            "Lafite", complex_wine_vintage, client=supabase
        )
        assert result is not None
        assert "Lafite" in result.name
        assert int(result.vintage) == complex_wine_vintage

    finally:
        # Clean up: Delete the test wines
        await delete_wine(created_wine.id, client=supabase)
        await delete_wine(created_complex_wine.id, client=supabase)
