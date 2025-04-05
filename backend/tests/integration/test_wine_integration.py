import asyncio
import uuid
from datetime import datetime
from typing import Generator, List
from uuid import UUID

import pytest

from src.core import get_supabase_client
from src.wines.schemas import WineCreate
from src.wines.service import create_wine, delete_wine, get_wine


@pytest.fixture(scope="module")
def event_loop() -> Generator:
    """
    Create an event loop for pytest.
    """
    loop = asyncio.get_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_create_wine_with_same_wine_searcher_id():
    """Test that creating a wine with the same wine_searcher_id updates the existing wine"""
    # Get the real Supabase client
    client = get_supabase_client()

    # Generate unique test identifier to avoid conflicts with other tests
    test_id = str(uuid.uuid4())[:8]
    test_wine_searcher_id = f"test_{test_id}"

    # Create a test wine with our test wine_searcher_id
    wine1 = WineCreate(
        name=f"Integration Test Wine 1 {test_id}",
        wine_searcher_id=test_wine_searcher_id,
        vintage=2020,
        region="Test Region",
        varietal="Test Varietal",
    )

    try:
        # Create the first wine
        result1 = await create_wine(wine1, client)

        # Verify it was created correctly
        assert result1.name == wine1.name
        assert result1.wine_searcher_id == test_wine_searcher_id

        # Store the ID for cleanup
        wine1_id = result1.id

        # Create a second wine with the same wine_searcher_id but different data
        wine2 = WineCreate(
            name=f"Integration Test Wine 1 Updated {test_id}",
            wine_searcher_id=test_wine_searcher_id,
            vintage=2021,  # Changed vintage
            region="Updated Test Region",  # Changed region
            varietal="Updated Test Varietal",  # Changed varietal
        )

        # This should update the existing wine, not create a new one
        result2 = await create_wine(wine2, client)

        # Verify it was updated correctly
        assert result2.id == wine1_id  # Same ID indicates it's the same record
        assert result2.name == wine2.name  # Name was updated
        assert result2.vintage == wine2.vintage  # Vintage was updated
        assert result2.region == wine2.region  # Region was updated
        assert result2.varietal == wine2.varietal  # Varietal was updated
        assert (
            result2.wine_searcher_id == test_wine_searcher_id
        )  # wine_searcher_id remains the same

        # Fetch the wine directly to double-check it was updated
        fetched_wine = await get_wine(wine1_id, client)
        assert fetched_wine is not None
        assert fetched_wine.name == wine2.name
        assert fetched_wine.vintage == wine2.vintage

    finally:
        # Clean up: delete the test wine
        if "wine1_id" in locals():
            await delete_wine(wine1_id, client)


@pytest.mark.asyncio
async def test_create_wine_with_different_wine_searcher_id():
    """Test that creating wines with different wine_searcher_ids creates separate records"""
    # Get the real Supabase client
    client = get_supabase_client()

    # Generate unique test identifiers
    test_id = str(uuid.uuid4())[:8]
    test_wine_searcher_id1 = f"test_a_{test_id}"
    test_wine_searcher_id2 = f"test_b_{test_id}"

    wine_ids = []

    try:
        # Create first wine
        wine1 = WineCreate(
            name=f"Integration Test Wine A {test_id}",
            wine_searcher_id=test_wine_searcher_id1,
            vintage=2020,
            varietal="Test Varietal A",
        )
        result1 = await create_wine(wine1, client)
        wine_ids.append(result1.id)

        # Create second wine with different wine_searcher_id
        wine2 = WineCreate(
            name=f"Integration Test Wine B {test_id}",
            wine_searcher_id=test_wine_searcher_id2,
            vintage=2020,
            varietal="Test Varietal B",
        )
        result2 = await create_wine(wine2, client)
        wine_ids.append(result2.id)

        # Verify we have two different wines
        assert result1.id != result2.id
        assert result1.wine_searcher_id != result2.wine_searcher_id
        assert result1.name != result2.name

        # Fetch both wines directly to verify they exist
        fetched_wine1 = await get_wine(result1.id, client)
        fetched_wine2 = await get_wine(result2.id, client)

        assert fetched_wine1 is not None
        assert fetched_wine2 is not None
        assert fetched_wine1.wine_searcher_id == test_wine_searcher_id1
        assert fetched_wine2.wine_searcher_id == test_wine_searcher_id2

    finally:
        # Clean up: delete the test wines
        for wine_id in wine_ids:
            await delete_wine(wine_id, client)


@pytest.mark.asyncio
async def test_create_wine_without_wine_searcher_id():
    """Test that creating wines without wine_searcher_id works correctly"""
    # Get the real Supabase client
    client = get_supabase_client()

    # Generate unique test identifier
    test_id = str(uuid.uuid4())[:8]

    wine_ids = []

    try:
        # Create first wine without wine_searcher_id
        wine1 = WineCreate(
            name=f"Integration Test Wine No ID 1 {test_id}",
            vintage=2020,
            varietal="Test Varietal No ID 1",
        )
        result1 = await create_wine(wine1, client)
        wine_ids.append(result1.id)

        # Create second wine without wine_searcher_id
        wine2 = WineCreate(
            name=f"Integration Test Wine No ID 2 {test_id}",
            vintage=2020,
            varietal="Test Varietal No ID 2",
        )
        result2 = await create_wine(wine2, client)
        wine_ids.append(result2.id)

        # Verify we have two different wines
        assert result1.id != result2.id
        assert result1.wine_searcher_id is None
        assert result2.wine_searcher_id is None
        assert result1.name != result2.name

    finally:
        # Clean up: delete the test wines
        for wine_id in wine_ids:
            await delete_wine(wine_id, client)


@pytest.mark.asyncio
async def test_bulk_wine_creation_with_duplicates():
    """Test handling multiple wines where some have duplicate wine_searcher_ids"""
    client = get_supabase_client()

    test_id = str(uuid.uuid4())[:8]
    test_wine_searcher_id1 = f"test_bulk_1_{test_id}"
    test_wine_searcher_id2 = f"test_bulk_2_{test_id}"

    wine_ids = []

    try:
        # Create wines in sequence with some having the same wine_searcher_id
        wines_to_create = [
            WineCreate(
                name=f"Bulk Test Wine 1 Original {test_id}",
                wine_searcher_id=test_wine_searcher_id1,
                vintage=2020,
                varietal="Test Varietal Bulk 1",
            ),
            WineCreate(
                name=f"Bulk Test Wine 2 {test_id}",
                wine_searcher_id=test_wine_searcher_id2,
                vintage=2021,
                varietal="Test Varietal Bulk 2",
            ),
            WineCreate(
                name=f"Bulk Test Wine 3 No ID {test_id}",
                vintage=2022,
                varietal="Test Varietal Bulk 3",
            ),
            WineCreate(
                name=f"Bulk Test Wine 1 Updated {test_id}",  # Same ID as first wine, should update it
                wine_searcher_id=test_wine_searcher_id1,
                vintage=2023,
                region="Updated Region",
                varietal="Updated Test Varietal Bulk 1",
            ),
            WineCreate(
                name=f"Bulk Test Wine 4 No ID {test_id}",  # Another wine with no ID
                vintage=2024,
                varietal="Test Varietal Bulk 4",
            ),
        ]

        results = []
        for wine in wines_to_create:
            result = await create_wine(wine, client)
            results.append(result)
            if result.id not in [
                r.id for r in results[:-1]
            ]:  # Only add if it's a new ID
                wine_ids.append(result.id)

        # We should have 4 unique wines (the 4th wine updated the 1st one)
        assert len(wine_ids) == 4

        # The first and fourth wines should have the same ID
        assert results[0].id == results[3].id

        # The first wine should have been updated with data from the fourth wine
        assert results[3].name == wines_to_create[3].name
        assert results[3].vintage == wines_to_create[3].vintage
        assert results[3].region == wines_to_create[3].region
        assert results[3].varietal == wines_to_create[3].varietal

        # The wines with no wine_searcher_id should have created new records
        assert results[2].id != results[4].id
        assert results[2].wine_searcher_id is None
        assert results[4].wine_searcher_id is None

    finally:
        # Clean up
        for wine_id in wine_ids:
            await delete_wine(wine_id, client)


@pytest.mark.asyncio
async def test_application_level_constraint():
    """
    Test that our application-level logic prevents duplicate wines with the same wine_searcher_id.

    Note: This test verifies that our application correctly handles duplicates, even if the
    database-level constraint isn't enforced in the test environment.
    """
    client = get_supabase_client()

    test_id = str(uuid.uuid4())[:8]
    test_wine_searcher_id = f"test_constraint_{test_id}"
    wine_ids = []

    try:
        # First, insert a wine normally
        wine1 = WineCreate(
            name=f"Application Test Wine 1 {test_id}",
            wine_searcher_id=test_wine_searcher_id,
            vintage=2020,
            varietal="Test Varietal Constraint",
        )
        result1 = await create_wine(wine1, client)
        wine_ids.append(result1.id)

        # Create a second wine with the same wine_searcher_id
        wine2 = WineCreate(
            name=f"Application Test Wine 2 {test_id}",
            wine_searcher_id=test_wine_searcher_id,  # Same wine_searcher_id
            vintage=2021,
            varietal="Test Varietal Updated",
        )

        # Our application logic should update the existing wine rather than creating a new one
        result2 = await create_wine(wine2, client)

        # They should have the same ID because the update happened instead of insert
        assert result1.id == result2.id

        # The wine should have the updated data
        assert result2.name == wine2.name
        assert result2.vintage == wine2.vintage
        assert result2.varietal == wine2.varietal

        # Create a third wine to verify the service works with multiple wines
        wine3 = WineCreate(
            name=f"Application Test Wine 3 {test_id}",
            wine_searcher_id=f"test_different_{test_id}",  # Different wine_searcher_id
            vintage=2022,
            varietal="Test Varietal Different",
        )

        # This should create a new wine since the wine_searcher_id is different
        result3 = await create_wine(wine3, client)
        wine_ids.append(result3.id)

        # Different wine_searcher_id should create a different wine
        assert result3.id != result1.id
        assert result3.wine_searcher_id != result1.wine_searcher_id

        # Now verify application behavior when updating wine1 again
        wine4 = WineCreate(
            name=f"Application Test Wine 4 {test_id}",
            wine_searcher_id=test_wine_searcher_id,  # Same as wine1/wine2
            vintage=2023,
            varietal="Test Varietal Final",
        )

        result4 = await create_wine(wine4, client)

        # Should be the same wine as wine1 and wine2, updated with new data
        assert result4.id == result1.id
        assert result4.id == result2.id
        assert result4.name == wine4.name
        assert result4.vintage == wine4.vintage
        assert result4.varietal == wine4.varietal

    finally:
        # Clean up
        for wine_id in wine_ids:
            await delete_wine(wine_id, client)
