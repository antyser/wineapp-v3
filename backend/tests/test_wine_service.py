import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from src.wines.schemas import Wine, WineCreate
from src.wines.service import create_wine


@pytest.mark.asyncio
async def test_create_wine_with_same_wine_searcher_id():
    """Test that creating a wine with the same wine_searcher_id updates the existing wine"""
    # Mock the Supabase client
    mock_client = AsyncMock()

    # Set up the mock for the first creation
    mock_client.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Test Wine 1",
            "wine_searcher_id": "123456",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    ]

    # Set up the mock for searching for existing wine
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "12345678-1234-5678-1234-567812345678",
            "name": "Test Wine 1",
            "wine_searcher_id": "123456",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    ]

    # Set up the mock for updating existing wine
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "12345678-1234-5678-1234-567812345678",
            "name": "Test Wine Updated",
            "wine_searcher_id": "123456",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    ]

    # Create first wine
    wine1 = WineCreate(
        name="Test Wine 1",
        wine_searcher_id="123456",
    )
    result1 = await create_wine(wine1, mock_client)

    # Create second wine with same wine_searcher_id but different name
    wine2 = WineCreate(
        name="Test Wine Updated",
        wine_searcher_id="123456",
    )
    result2 = await create_wine(wine2, mock_client)

    # Assert that the second call updated the existing wine rather than creating a new one
    assert result2.name == "Test Wine Updated"
    assert result2.wine_searcher_id == "123456"

    # Verify that the update method was called instead of insert for the second wine
    mock_client.table.return_value.update.assert_called_once()

    # Check that we're updating the correct wine by ID
    mock_client.table.return_value.update.return_value.eq.assert_called_with(
        "id", "12345678-1234-5678-1234-567812345678"
    )


@pytest.mark.asyncio
async def test_create_wine_with_different_wine_searcher_id():
    """Test that creating a wine with a different wine_searcher_id creates a new wine"""
    # Mock the Supabase client
    mock_client = AsyncMock()

    # Set up the mock for the first creation
    wine1_id = str(uuid.uuid4())
    mock_client.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": wine1_id,
            "name": "Test Wine 1",
            "wine_searcher_id": "123456",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    ]

    # Set up the mock for searching for existing wine - empty result
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
        []
    )

    # Create first wine
    wine1 = WineCreate(
        name="Test Wine 1",
        wine_searcher_id="123456",
    )
    result1 = await create_wine(wine1, mock_client)

    # Update mock for second wine creation
    wine2_id = str(uuid.uuid4())
    mock_client.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": wine2_id,
            "name": "Test Wine 2",
            "wine_searcher_id": "789012",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    ]

    # Create second wine with different wine_searcher_id
    wine2 = WineCreate(
        name="Test Wine 2",
        wine_searcher_id="789012",
    )
    result2 = await create_wine(wine2, mock_client)

    # Assert that the second call created a new wine
    assert result2.name == "Test Wine 2"
    assert result2.wine_searcher_id == "789012"

    # Verify that insert was called twice (once for each wine)
    assert mock_client.table.return_value.insert.call_count == 2
