"""
Tests for the wines service module
"""

from uuid import UUID

import pytest

from src.wines.schemas import WineCreate, WineSearchParams, WineUpdate
from src.wines.service import (
    MyWinesSearchParams,
    create_wine,
    delete_wine,
    get_wine,
    get_wines,
    search_wine_from_db,
    search_wines,
    update_wine,
)
from tests.wines.mock_wines import get_mock_wines  # Import the mock wines function


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
    # Get a mock wine to use as template
    mock_wines = get_mock_wines()
    mock_wine = mock_wines[0]

    # Create a new test wine based on the mock data
    new_wine = WineCreate(
        name=f"Test Wine from Mock {mock_wine['name']}",
        winery=mock_wine["winery"],
        vintage=mock_wine["vintage"],
        region=mock_wine["region"],
        country=mock_wine["country"],
        varietal=mock_wine["varietal"],
        type=mock_wine["type"],
        price=mock_wine["price"],
        rating=None,  # Use None to test a different value
        tasting_notes=mock_wine.get("tasting_notes"),
        wine_searcher_url=mock_wine.get("wine_searcher_url"),
        average_price=mock_wine.get("average_price"),
        description=mock_wine.get("description"),
        drinking_window=mock_wine.get("drinking_window"),
        food_pairings=mock_wine.get("food_pairings"),
        abv=mock_wine.get("abv"),
        wine_searcher_id=mock_wine.get("wine_searcher_id"),
        name_alias=mock_wine.get("name_alias"),
    )

    created_wine = await create_wine(new_wine, client=supabase)
    assert created_wine is not None
    assert created_wine.name == new_wine.name
    assert created_wine.winery == new_wine.winery
    assert created_wine.vintage == new_wine.vintage
    assert created_wine.id is not None
    assert created_wine.tasting_notes == new_wine.tasting_notes
    assert created_wine.wine_searcher_url == new_wine.wine_searcher_url
    assert created_wine.average_price == new_wine.average_price
    assert created_wine.description == new_wine.description
    assert created_wine.drinking_window == new_wine.drinking_window
    assert created_wine.food_pairings == new_wine.food_pairings
    assert created_wine.abv == new_wine.abv
    assert created_wine.wine_searcher_id == new_wine.wine_searcher_id
    assert created_wine.name_alias == new_wine.name_alias

    # Verify it was actually saved
    retrieved_wine = await get_wine(created_wine.id, client=supabase)
    assert retrieved_wine is not None
    assert retrieved_wine.id == created_wine.id
    assert retrieved_wine.name == new_wine.name
    assert retrieved_wine.tasting_notes == new_wine.tasting_notes
    assert retrieved_wine.abv == new_wine.abv
    assert retrieved_wine.name_alias == new_wine.name_alias


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
        tasting_notes="Original tasting notes",
        wine_searcher_url="http://example.com/update-test",
        average_price=18.50,
        description="Original description.",
        drinking_window="2023-2025",
        food_pairings="Fish, Salad",
        abv="12.5%",
        wine_searcher_id="update-test-456",
        name_alias=["Original Alias"],
    )
    created_wine = await create_wine(new_wine, client=supabase)

    # Update the wine
    update_data = WineUpdate(
        name="Updated Test Wine",
        tasting_notes="Updated tasting notes",
        price=22.99,
        drinking_window="2024-2026",
        abv="13.0%",
        name_alias=["Updated Alias 1", "Updated Alias 2"],
    )
    updated_wine = await update_wine(created_wine.id, update_data, client=supabase)

    assert updated_wine is not None
    assert updated_wine.id == created_wine.id
    assert updated_wine.name == update_data.name
    assert updated_wine.tasting_notes == update_data.tasting_notes
    assert updated_wine.price == update_data.price
    assert updated_wine.drinking_window == update_data.drinking_window
    assert updated_wine.abv == update_data.abv
    assert updated_wine.vintage == created_wine.vintage
    assert updated_wine.winery == created_wine.winery
    assert updated_wine.average_price == created_wine.average_price
    assert updated_wine.food_pairings == created_wine.food_pairings
    assert updated_wine.name_alias == update_data.name_alias

    # Verify it was actually saved
    retrieved_wine = await get_wine(created_wine.id, client=supabase)
    assert retrieved_wine is not None
    assert retrieved_wine.name == update_data.name
    assert retrieved_wine.tasting_notes == update_data.tasting_notes
    assert retrieved_wine.drinking_window == update_data.drinking_window
    assert retrieved_wine.name_alias == update_data.name_alias


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
        vintage=2020,
        region="Delete Region",
        country="Delete Country",
        varietal="Delete Varietal",
        type="Rose",
        name_alias=["Del Alias"],
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
async def test_search_wines(supabase):
    """
    Test searching for wines with various filters and user context
    """
    # Get mock wines to use for testing
    mock_wines = get_mock_wines()

    # Create at least 2 test wines with distinct properties for filtering
    test_wine1 = WineCreate(
        name="SearchTest Red Wine",
        winery="Search Winery",
        vintage=2019,
        region="Search Region",
        country="Search Country",
        varietal="Cabernet Sauvignon",
        type="Red",
        price=49.99,
        tasting_notes="Search test tasting notes for red wine",
    )

    test_wine2 = WineCreate(
        name="SearchTest White Wine",
        winery="Search Winery",
        vintage=2021,
        region="Search Region",
        country="Search Country",
        varietal="Chardonnay",
        type="White",
        price=29.99,
        tasting_notes="Search test tasting notes for white wine",
    )

    # Create the test wines in the database
    created_wine1 = await create_wine(test_wine1, client=supabase)
    created_wine2 = await create_wine(test_wine2, client=supabase)

    # Test 1: Basic search without user context
    params = MyWinesSearchParams(limit=10, offset=0)

    results = await search_wines(params=params, client=supabase)
    assert results is not None
    assert isinstance(results.items, list)
    assert results.total >= 2  # At least our 2 test wines

    # Test 2: Search with query filter
    query_params = MyWinesSearchParams(query="SearchTest", limit=10, offset=0)

    query_results = await search_wines(params=query_params, client=supabase)
    assert query_results is not None
    assert query_results.total >= 2

    # Verify both test wines are in the results
    test_wine_ids = {str(created_wine1.id), str(created_wine2.id)}
    found_ids = {
        str(wine.id) for wine in query_results.items if str(wine.id) in test_wine_ids
    }
    assert len(found_ids) == 2

    # Test 3: Search with wine type filter
    type_params = MyWinesSearchParams(wine_type="Red", limit=10, offset=0)

    type_results = await search_wines(params=type_params, client=supabase)
    assert type_results is not None

    # Should include our red test wine
    found_red = any(
        str(wine.id) == str(created_wine1.id) for wine in type_results.items
    )
    assert found_red

    # Shouldn't include our white test wine
    found_white = any(
        str(wine.id) == str(created_wine2.id) for wine in type_results.items
    )
    assert not found_white

    # Test 4: Search with user context (should return empty since no interactions exist)
    test_user_id = UUID("00000000-0000-0000-0000-000000000999")  # A test user ID
    user_params = MyWinesSearchParams(limit=10, offset=0)
    user_results = await search_wines(
        user_id=test_user_id, params=user_params, client=supabase
    )

    # Since this test user has no interactions, results should be empty
    assert user_results is not None
    assert user_results.total == 0
    assert len(user_results.items) == 0

    # Test 5: Search with user context after creating an interaction
    # First, create an interaction for the test user and the first test wine
    interaction_data = {
        "user_id": str(test_user_id),
        "wine_id": str(created_wine1.id),
        "wishlist": True,
        "rating": 4,
    }
    supabase.table("interactions").insert(interaction_data).execute()

    # Now search for the user's wines again
    user_results_with_interaction = await search_wines(
        user_id=test_user_id, params=user_params, client=supabase
    )

    # Should find exactly one wine now
    assert user_results_with_interaction is not None
    assert user_results_with_interaction.total == 1
    assert len(user_results_with_interaction.items) == 1

    # Verify it's the right wine
    assert str(user_results_with_interaction.items[0].id) == str(created_wine1.id)

    # Verify the enriched user data is present
    assert user_results_with_interaction.items[0].wishlist is True
    assert user_results_with_interaction.items[0].rating == 4

    # Test 6: Verify that not providing user_id returns ALL wines
    # This ensures search_wines works in "global mode" when no user_id is passed
    # Create a new params object to search for our test wines
    global_params = MyWinesSearchParams(
        query="SearchTest",  # Only find our test wines for clear comparison
        limit=10,
        offset=0,
    )

    # Search without providing a user_id
    global_results = await search_wines(params=global_params, client=supabase)

    # Should find both our test wines regardless of interactions
    assert global_results is not None
    assert global_results.total >= 2

    # Verify both test wines are in the results
    global_found_ids = {
        str(wine.id) for wine in global_results.items if str(wine.id) in test_wine_ids
    }
    assert len(global_found_ids) == 2

    # The wines should have default enrichment values when no user context
    for wine in global_results.items:
        if str(wine.id) in test_wine_ids:
            # Without user_id, wishlist should be False and rating should be None
            assert wine.wishlist is False
            assert wine.rating is None
            assert wine.latest_note is None

    # Clean up - delete the interaction
    supabase.table("interactions").delete().eq("user_id", str(test_user_id)).execute()

    # Test 7: Test sorting of results
    # Create a new params object for sorting tests
    sort_params = MyWinesSearchParams(
        query="SearchTest",  # Find only our test wines
        sort_by="vintage",
        sort_order="asc",
        limit=10,
        offset=0,
    )

    # Get results sorted by vintage ascending (oldest first)
    sort_asc_results = await search_wines(params=sort_params, client=supabase)
    assert sort_asc_results is not None
    assert sort_asc_results.total >= 2

    # Filter to only our test wines
    test_wines_asc = [
        wine for wine in sort_asc_results.items if str(wine.id) in test_wine_ids
    ]
    assert len(test_wines_asc) == 2

    # The red wine (2019) should come before the white wine (2021) in ascending order
    assert str(test_wines_asc[0].id) == str(created_wine1.id)
    assert str(test_wines_asc[1].id) == str(created_wine2.id)

    # Now test descending order (newest first)
    sort_params.sort_order = "desc"
    sort_desc_results = await search_wines(params=sort_params, client=supabase)

    # Filter to only our test wines
    test_wines_desc = [
        wine for wine in sort_desc_results.items if str(wine.id) in test_wine_ids
    ]
    assert len(test_wines_desc) == 2

    # The white wine (2021) should come before the red wine (2019) in descending order
    assert str(test_wines_desc[0].id) == str(created_wine2.id)
    assert str(test_wines_desc[1].id) == str(created_wine1.id)

    # Cleanup - delete the test wines
    await delete_wine(created_wine1.id, client=supabase)
    await delete_wine(created_wine2.id, client=supabase)


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
        tasting_notes="Search test tasting notes 1",
        abv="14.0%",
        name_alias=["Search Alias 1"],
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
        tasting_notes="Search test tasting notes 2",
        abv="13.8%",
        name_alias=["Complex Alias", "Laf Alias"],
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
