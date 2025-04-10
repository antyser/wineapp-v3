import io
from typing import List, Optional
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from src.auth import get_current_user
from src.core.config import settings

# Assuming your FastAPI app instance is created in src.main
# Adjust the import path if your app instance is located elsewhere
from src.main import app
from src.search.history.schemas import SearchHistory, SearchHistoryCreate
from src.wines.schemas import Wine

client = TestClient(app)

# --- Fixtures (if needed later, e.g., for auth or db setup) ---

TEST_USER_ID = uuid4()


@pytest.fixture(autouse=True)
def override_dependency():
    # Mock the get_current_user dependency for all tests in this module
    async def mock_get_current_user() -> UUID:
        return TEST_USER_ID

    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides = {}  # Clear overrides after test


# --- Test Cases ---


# Placeholder for tests
def test_placeholder():
    assert True


@pytest.mark.asyncio
@patch("src.search.api.create_search_history_record", new_callable=AsyncMock)
@patch("src.search.api.ai_search_wines", new_callable=AsyncMock)
async def test_search_wines_text_input(
    mock_ai_search: AsyncMock,
    mock_create_history: AsyncMock,
):
    """Test POST /search endpoint with text input."""
    # --- Arrange ---
    test_query = "Test Wine Name"
    # Mock return value for ai_search_wines (list of dicts)
    mock_wine_dict = {
        "id": uuid4(),
        "name": "Mock Wine",
        "vintage": 2020,
        # Add other necessary fields as defined in Wine schema
        "created_at": "2023-01-01T00:00:00",
        "updated_at": "2023-01-01T00:00:00",
    }
    mock_ai_search.return_value = [mock_wine_dict]
    mock_create_history.return_value = (
        None  # Doesn't need to return anything significant
    )

    # --- Act ---
    response = client.post(
        f"{settings.API_V1_STR}/search",
        data={"text_input": test_query},
        # No files needed for text search
    )

    # --- Assert ---
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) == 1
    # Convert UUID back for comparison if needed, or compare relevant fields
    assert response_data[0]["name"] == mock_wine_dict["name"]
    assert response_data[0]["vintage"] == mock_wine_dict["vintage"]

    # Check that the mocked service functions were called correctly
    mock_ai_search.assert_called_once_with(text_input=test_query, image_content=None)

    # Check history creation call
    mock_create_history.assert_called_once()
    # Inspect the arguments passed to create_search_history_record
    call_args, call_kwargs = mock_create_history.call_args
    history_arg = call_args[0]  # The history_data object
    assert isinstance(history_arg, SearchHistoryCreate)
    assert history_arg.user_id == TEST_USER_ID
    assert history_arg.search_type == "text"
    assert history_arg.search_query == test_query
    assert history_arg.result_wine_ids == [UUID(str(mock_wine_dict["id"]))]


@pytest.mark.asyncio
@patch("src.search.api.create_search_history_record", new_callable=AsyncMock)
@patch("src.search.api.ai_search_wines", new_callable=AsyncMock)
async def test_search_wines_image_input(
    mock_ai_search: AsyncMock,
    mock_create_history: AsyncMock,
):
    """Test POST /search endpoint with image file input."""
    # --- Arrange ---
    mock_wine_dict = {
        "id": uuid4(),
        "name": "Mock Wine",
        "vintage": 2020,
        # Add other necessary fields as defined in Wine schema
        "created_at": "2023-01-01T00:00:00",
        "updated_at": "2023-01-01T00:00:00",
        # Ensure all fields expected by Wine.model_validate are present
        "winery": None,
        "region": None,
        "country": None,
        "varietal": None,
        "type": None,
        "price": None,
        "rating": None,
        "tasting_notes": None,
        "wine_searcher_url": None,
        "average_price": None,
        "description": None,
        "drinking_window": None,
        "food_pairings": None,
        "abv": None,
        "name_alias": None,
        "image_url": None,
        "wine_searcher_id": None,
    }
    mock_ai_search.return_value = [mock_wine_dict]
    mock_create_history.return_value = None

    # Create a dummy image file in memory
    image_content = b"fakeimagedata"
    image_file = io.BytesIO(image_content)
    file_name = "test_image.jpg"

    # --- Act ---
    response = client.post(
        f"{settings.API_V1_STR}/search",
        files={"image": (file_name, image_file, "image/jpeg")},
        # No data needed for image search
    )

    # --- Assert ---
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) == 1
    assert response_data[0]["name"] == mock_wine_dict["name"]

    # Check ai_search_wines call
    mock_ai_search.assert_called_once()
    call_args, call_kwargs = mock_ai_search.call_args
    assert call_kwargs.get("text_input") is None
    assert call_kwargs.get("image_content") == image_content

    # Check history creation call
    mock_create_history.assert_called_once()
    call_args, call_kwargs = mock_create_history.call_args
    history_arg = call_args[0]
    assert isinstance(history_arg, SearchHistoryCreate)
    assert history_arg.user_id == TEST_USER_ID
    assert history_arg.search_type == "image"
    assert history_arg.search_query == file_name
    assert history_arg.result_wine_ids == [UUID(str(mock_wine_dict["id"]))]


@pytest.mark.asyncio
@patch("src.search.api.get_search_history_for_user", new_callable=AsyncMock)
async def test_get_search_history(
    mock_get_history: AsyncMock,
):
    """Test GET /search/history endpoint."""
    # --- Arrange ---
    # Mock return value for get_search_history_for_user
    mock_history_item = SearchHistory(
        id=uuid4(),
        user_id=TEST_USER_ID,
        search_type="text",
        search_query="past query",
        result_wine_ids=[uuid4()],
        created_at="2023-01-02T00:00:00",  # Use string for mock
    )
    mock_get_history.return_value = [mock_history_item]

    test_limit = 10
    test_offset = 5

    # --- Act ---
    response = client.get(
        f"{settings.API_V1_STR}/search/history?limit={test_limit}&offset={test_offset}"
    )

    # --- Assert ---
    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) == 1
    # Compare relevant fields, ensuring UUIDs/datetimes are handled if needed
    assert response_data[0]["search_query"] == mock_history_item.search_query
    assert response_data[0]["id"] == str(mock_history_item.id)
    assert response_data[0]["user_id"] == str(TEST_USER_ID)

    # Check that the mocked service function was called correctly
    mock_get_history.assert_called_once_with(TEST_USER_ID, test_limit, test_offset)
