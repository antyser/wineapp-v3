import asyncio
from datetime import datetime
from uuid import UUID

import pytest

from src.auth.models import User
from src.core.supabase import get_supabase_client
from src.wines.schemas import UserWineResponse
from src.wines.service import get_user_wine


@pytest.mark.asyncio
async def test_get_user_wine_with_supabase():
    """
    Integration test for get_user_wine using real Supabase client.
    This test assumes the seed data has been loaded into the database.
    """
    # Get supabase client
    client = get_supabase_client()

    # Use the test user and first test wine from seed.sql
    test_user_id = UUID("00000000-0000-0000-0000-000000000000")
    test_email = "test@example.com"
    test_wine_id = UUID("11111111-1111-1111-1111-111111111111")

    # Create a mock user
    mock_user = User(
        id=test_user_id,
        email=test_email,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    # Get user wine information directly
    result = await get_user_wine(test_wine_id, mock_user.id, client)

    # Validate wine data
    assert result["wine"] is not None, "Wine data not found"
    assert result["wine"]["id"] == str(test_wine_id), "Wine ID doesn't match"
    assert result["wine"]["name"] == "Test Red Wine", "Wine name doesn't match"

    # Validate interaction (should exist from seed data)
    assert result["interaction"] is not None, "Interaction not found"
    assert (
        result["interaction"]["liked"] is True
    ), "Interaction liked status doesn't match"

    # Notes should exist from seed data
    assert len(result["notes"]) > 0, "Notes not found"
    note = result["notes"][0]
    assert note["wine_id"] == str(test_wine_id), "Note wine_id doesn't match"
    assert (
        note["note_text"] == "Excellent red wine with strong tannins"
    ), "Note text doesn't match"

    # Cellar wines should exist from seed data
    assert "cellar_wines" in result, "Cellar wines key not found in result"
    assert len(result["cellar_wines"]) > 0, "No cellar wines found"

    # Validate first cellar wine entry
    cellar_wine = result["cellar_wines"][0]
    assert cellar_wine["wine_id"] == str(
        test_wine_id
    ), "Cellar wine wine_id doesn't match"
    assert "cellars" in cellar_wine, "Cellar information not included"
    assert cellar_wine["cellars"]["name"] == "Test Cellar", "Cellar name doesn't match"
    assert cellar_wine["quantity"] == 2, "Cellar wine quantity doesn't match"

    # Test Pydantic model validation by reconstructing the response
    # This will raise an exception if the data doesn't match the schema
    user_wine_response = UserWineResponse(**result)

    # Verify the Pydantic model contains the same data
    assert str(user_wine_response.wine.id) == str(
        test_wine_id
    ), "Wine ID in model doesn't match"
    assert user_wine_response.interaction.liked is True
    assert len(user_wine_response.notes) > 0
    assert (
        user_wine_response.notes[0].note_text
        == "Excellent red wine with strong tannins"
    )
    assert len(user_wine_response.cellar_wines) > 0, "No cellar wines in model"

    # Verify search_history is not in the model
    assert not hasattr(
        user_wine_response, "search_history"
    ), "search_history should not be in model"
