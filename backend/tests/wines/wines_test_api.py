"""
Tests for the wines API endpoints
"""

from fastapi.testclient import TestClient

from src.main import app
from src.wines import wines_router


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
        "notes": "API Updated notes",
        "price": 24.99,
    }
    response = client.patch(f"/api/v1/wines/{created_wine['id']}", json=update_data)
    assert response.status_code == 200
    updated_wine = response.json()

    assert updated_wine["id"] == created_wine["id"]
    assert updated_wine["name"] == update_data["name"]
    assert updated_wine["notes"] == update_data["notes"]
    assert updated_wine["price"] == update_data["price"]
    assert updated_wine["vintage"] == created_wine["vintage"]  # Unchanged

    # Verify it was actually saved
    response = client.get(f"/api/v1/wines/{created_wine['id']}")
    assert response.status_code == 200
    retrieved_wine = response.json()
    assert retrieved_wine["name"] == update_data["name"]
    assert retrieved_wine["notes"] == update_data["notes"]


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
