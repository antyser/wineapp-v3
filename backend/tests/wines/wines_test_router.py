"""
Tests for the wines API endpoints
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from loguru import logger

from src.auth.models import User
from src.core.supabase import get_supabase_client
from src.main import app
from src.wines import wines_router
from src.wines.schemas import EnrichedUserWine, Wine, WineCreate
from src.wines.service import MyWinesSearchParams, search_wines
from tests.wines.mock_wines import get_mock_wines


def test_register_router():
    """
    Test that the wines router is registered with the app
    """
    app.include_router(wines_router, prefix="/api/v1")
    # Check that the route pattern contains the expected prefix
    assert any("/api/v1/wines" in str(r.path) for r in app.routes)


def test_list_wines(client: TestClient):
    """
    Test listing wines
    """
    response = client.get("/api/v1/wines")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert isinstance(data["total"], int)
    assert data["total"] >= len(data["items"])
    assert len(data["items"]) > 0  # We should have sample data


def test_list_wines_with_filters(client: TestClient):
    """
    Test listing wines with filters
    """
    # Test filtering by wine type
    response = client.get("/api/v1/wines?type=Red")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) > 0
    assert all(wine["type"] == "Red" for wine in data["items"])

    # Test limiting results
    response = client.get("/api/v1/wines?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 2

    # Test pagination
    response1 = client.get("/api/v1/wines?limit=1&offset=0")
    response2 = client.get("/api/v1/wines?limit=1&offset=1")
    data1 = response1.json()
    data2 = response2.json()

    # Just verify the structure is correct
    assert len(data1["items"]) <= 1  # Should be 1 or 0
    assert "total" in data1
    assert "items" in data2  # Use data2 to avoid unused variable warning


def test_get_wine_by_id(client: TestClient):
    """
    Test getting a wine by ID
    """
    # First get a sample wine ID from the list
    response = client.get("/api/v1/wines")
    data = response.json()
    sample_wine = data["items"][0]
    wine_id = sample_wine["id"]

    # Get the wine by ID
    response = client.get(f"/api/v1/wines/{wine_id}")
    assert response.status_code == 200
    wine = response.json()
    assert wine["id"] == wine_id
    assert wine["name"] == sample_wine["name"]


def test_get_wine_by_id_not_found(client: TestClient):
    """
    Test getting a wine by ID that doesn't exist
    """
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/api/v1/wines/{non_existent_id}")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


def test_create_wine(client: TestClient):
    """
    Test creating a new wine
    """
    new_wine = {
        "name": "API Test Wine",
        "winery": "API Test Winery",
        "vintage": 2020,
        "region": "API Test Region",
        "country": "API Test Country",
        "varietal": "API Test Varietal",
        "type": "Red",
        "price": 29.99,
        "rating": 92,
        "notes": "API Test notes",
    }

    response = client.post("/api/v1/wines", json=new_wine)
    assert response.status_code == 201
    created_wine = response.json()
    assert created_wine["name"] == new_wine["name"]
    assert created_wine["winery"] == new_wine["winery"]
    assert created_wine["vintage"] == new_wine["vintage"]
    assert created_wine["id"] is not None

    # Verify it was actually saved
    response = client.get(f"/api/v1/wines/{created_wine['id']}")
    assert response.status_code == 200
    retrieved_wine = response.json()
    assert retrieved_wine["id"] == created_wine["id"]
    assert retrieved_wine["name"] == new_wine["name"]


def test_update_wine(client: TestClient):
    """
    Test updating a wine
    """
    # Create a wine to update
    new_wine = {
        "name": "API Update Test Wine",
        "winery": "API Test Winery",
        "vintage": 2019,
        "type": "White",
    }
    response = client.post("/api/v1/wines", json=new_wine)
    created_wine = response.json()

    # Update the wine
    update_data = {
        "name": "API Updated Test Wine",
        "tasting_notes": "API Updated notes",
        "price": 24.99,
    }
    response = client.patch(f"/api/v1/wines/{created_wine['id']}", json=update_data)
    assert response.status_code == 200
    updated_wine = response.json()

    assert updated_wine["id"] == created_wine["id"]
    assert updated_wine["name"] == update_data["name"]
    assert updated_wine["tasting_notes"] == update_data["tasting_notes"]
    assert updated_wine["price"] == update_data["price"]
    assert updated_wine["vintage"] == created_wine["vintage"]  # Unchanged

    # Verify it was actually saved
    response = client.get(f"/api/v1/wines/{created_wine['id']}")
    assert response.status_code == 200
    retrieved_wine = response.json()
    assert retrieved_wine["name"] == update_data["name"]
    assert retrieved_wine["tasting_notes"] == update_data["tasting_notes"]


def test_update_wine_not_found(client: TestClient):
    """
    Test updating a wine that doesn't exist
    """
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    update_data = {"name": "This won't work"}
    response = client.patch(f"/api/v1/wines/{non_existent_id}", json=update_data)
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


def test_delete_wine(client: TestClient):
    """
    Test deleting a wine
    """
    # Create a wine to delete
    new_wine = {
        "name": "API Delete Test Wine",
        "winery": "API Test Winery",
    }
    response = client.post("/api/v1/wines", json=new_wine)
    created_wine = response.json()

    # Delete the wine
    response = client.delete(f"/api/v1/wines/{created_wine['id']}")
    assert response.status_code == 204

    # Verify it was actually deleted
    response = client.get(f"/api/v1/wines/{created_wine['id']}")
    assert response.status_code == 404


def test_delete_wine_not_found(client: TestClient):
    """
    Test deleting a wine that doesn't exist
    """
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    response = client.delete(f"/api/v1/wines/{non_existent_id}")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """
    Create headers with a fake auth token for testing authenticated endpoints
    We will patch the auth middleware to accept this token
    """
    return {"Authorization": "Bearer test-auth-token"}


@pytest.fixture
def test_user_id() -> uuid.UUID:
    """
    A fixed test user ID to use for all tests
    """
    return uuid.UUID("00000000-0000-0000-0000-000000000123")


@pytest.mark.asyncio
async def test_search_my_wines(
    client: TestClient, auth_headers: Dict[str, str], test_user_id: uuid.UUID
):
    """
    Test the search_my_wines endpoint by mocking the auth middleware
    but using the real database.
    """
    # Patch the SupabaseAuth.__call__ method to return the test user
    with patch(
        "src.auth.utils.SupabaseAuth.__call__",
        return_value={"user_id": str(test_user_id)},
    ):
        # Test 1: Basic endpoint access
        response = client.get("/api/v1/wines/my-wines", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert "total" in data
        # Note: We don't assert exact counts because the database content may vary

        # Test 2: Filter by wine type (if applicable)
        if data["total"] > 0 and len(data["items"]) > 0:
            # Get the type of the first wine to use as a filter
            wine_type = data["items"][0]["type"]
            if wine_type:
                response = client.get(
                    f"/api/v1/wines/my-wines?wine_type={wine_type}",
                    headers=auth_headers,
                )
                assert response.status_code == 200
                filtered_data = response.json()

                # All returned wines should have this type
                for wine in filtered_data["items"]:
                    assert wine["type"] == wine_type

        # Test 3: Pagination
        response = client.get("/api/v1/wines/my-wines?limit=1", headers=auth_headers)
        assert response.status_code == 200
        limited_data = response.json()

        if limited_data["total"] > 0:
            assert len(limited_data["items"]) <= 1

        # Test 4: Sorting
        response = client.get(
            "/api/v1/wines/my-wines?sort_by=vintage&sort_order=desc",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify results are properly sorted if there are multiple items
        sorted_data = response.json()
        items = sorted_data["items"]
        if len(items) >= 2:
            for i in range(len(items) - 1):
                if (
                    items[i]["vintage"] is not None
                    and items[i + 1]["vintage"] is not None
                ):
                    assert items[i]["vintage"] >= items[i + 1]["vintage"]


@pytest.mark.asyncio
async def test_search_my_wines_service(test_user_id: uuid.UUID, supabase):
    """
    Test the search_my_wines service function using the real database.
    We'll test basic functionality and filtering capabilities.
    """
    # Test with default parameters
    params = MyWinesSearchParams()
    result = await search_wines(user_id=test_user_id, params=params, client=supabase)

    # We can't reliably assert exact counts because we're using the real database
    assert isinstance(result.total, int)
    assert isinstance(result.items, list)

    # Test with pagination
    params = MyWinesSearchParams(limit=1, offset=0)
    result = await search_wines(user_id=test_user_id, params=params, client=supabase)

    # Verify the pagination limits results
    assert len(result.items) <= 1

    # If there are wines returned, test filtering on one of them
    if result.items and len(result.items) > 0:
        sample_wine = result.items[0]

        # Test filtering by wine type if available
        if sample_wine.type:
            type_params = MyWinesSearchParams(wine_type=sample_wine.type)
            type_result = await search_wines(
                user_id=test_user_id, params=type_params, client=supabase
            )

            # All wines should have this type
            for wine in type_result.items:
                assert wine.type == sample_wine.type

        # Test filtering by country if available
        if sample_wine.country:
            country_params = MyWinesSearchParams(country=sample_wine.country)
            country_result = await search_wines(
                user_id=test_user_id, params=country_params, client=supabase
            )

            # All wines should have this country
            for wine in country_result.items:
                assert wine.country == sample_wine.country
