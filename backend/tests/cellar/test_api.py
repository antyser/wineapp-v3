from uuid import uuid4

import pytest
from src.core import settings


@pytest.fixture
def test_user_id(test_user_id_api):
    """Use the fixed test user ID for API tests"""
    return test_user_id_api


@pytest.fixture
def test_cellar(client, test_user_id):
    """Create a test cellar"""
    cellar_data = {
        "name": "Test Cellar",
        "sections": ["Kitchen", "Basement"],
        "user_id": str(test_user_id),
    }

    response = client.post(f"{settings.API_V1_STR}/cellars/", json=cellar_data)
    assert response.status_code == 201
    cellar = response.json()

    yield cellar

    # Clean up - delete the test cellar
    response = client.delete(f"{settings.API_V1_STR}/cellars/{cellar['id']}")
    assert response.status_code == 204


@pytest.fixture
def test_wine(client):
    """Create a test wine"""
    wine_data = {
        "name": "Test Wine for Cellar",
        "winery": "Test Winery",
        "vintage": 2020,
        "type": "red",
        "varietal": "Cabernet Sauvignon",
    }

    response = client.post(f"{settings.API_V1_STR}/wines/", json=wine_data)
    assert response.status_code == 201
    wine = response.json()

    yield wine

    # Clean up - delete the test wine
    response = client.delete(f"{settings.API_V1_STR}/wines/{wine['id']}")
    assert response.status_code == 204


@pytest.fixture
def test_cellar_wine(client, test_cellar, test_wine):
    """Create a test cellar wine entry"""
    cellar_wine_data = {
        "cellar_id": test_cellar["id"],
        "wine_id": test_wine["id"],
        "quantity": 3,
        "purchase_price": 25.99,
        "purchase_date": "2023-04-01",
        "section": "Kitchen",
        "size": "750ml",
        "status": "in_stock",
    }

    response = client.post(
        f"{settings.API_V1_STR}/cellars/wines", json=cellar_wine_data
    )
    assert response.status_code == 201
    cellar_wine = response.json()

    yield cellar_wine

    # Clean up - delete the test cellar wine
    # No need to clean up as this will be deleted when the cellar is deleted


def test_register_router(client):
    """Test that the cellar router is registered"""
    response = client.get(f"{settings.API_V1_STR}/cellars/")
    assert (
        response.status_code != 404
    )  # Any response other than 404 means the route exists


def test_list_cellars(client, test_cellar):
    """Test listing cellars"""
    response = client.get(f"{settings.API_V1_STR}/cellars/")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0

    # Check that our test cellar is in the list
    cellar_ids = [cellar["id"] for cellar in data["items"]]
    assert test_cellar["id"] in cellar_ids


def test_list_cellars_by_user(client, test_cellar, test_user_id):
    """Test listing cellars filtered by user ID"""
    response = client.get(
        f"{settings.API_V1_STR}/cellars/", params={"user_id": str(test_user_id)}
    )
    assert response.status_code == 200

    data = response.json()
    assert data["total"] > 0

    # Check that all returned cellars belong to the user
    for cellar in data["items"]:
        assert cellar["user_id"] == str(test_user_id)


def test_get_cellar(client, test_cellar):
    """Test getting a specific cellar"""
    response = client.get(f"{settings.API_V1_STR}/cellars/{test_cellar['id']}")
    assert response.status_code == 200

    cellar = response.json()
    assert cellar["id"] == test_cellar["id"]
    assert cellar["name"] == test_cellar["name"]
    assert cellar["sections"] == test_cellar["sections"]


def test_get_cellar_not_found(client):
    """Test getting a non-existent cellar"""
    non_existent_id = str(uuid4())
    response = client.get(f"{settings.API_V1_STR}/cellars/{non_existent_id}")
    assert response.status_code == 404


def test_create_cellar(client, test_user_id):
    """Test creating a cellar"""
    cellar_data = {
        "name": "New Test Cellar",
        "sections": ["Upstairs", "Living Room"],
        "user_id": str(test_user_id),
    }

    response = client.post(f"{settings.API_V1_STR}/cellars/", json=cellar_data)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.json()}")  # Print response to see what's happening
    assert response.status_code == 201

    cellar = response.json()
    assert cellar["name"] == cellar_data["name"]
    assert cellar["sections"] == cellar_data["sections"]
    assert cellar["user_id"] == cellar_data["user_id"]
    assert "id" in cellar
    assert "created_at" in cellar
    assert "updated_at" in cellar

    # Clean up - delete the created cellar
    response = client.delete(f"{settings.API_V1_STR}/cellars/{cellar['id']}")
    assert response.status_code == 204


def test_update_cellar(client, test_cellar):
    """Test updating a cellar"""
    update_data = {
        "name": "Updated Cellar Name",
        "sections": ["New Section", "Another Section"],
    }

    response = client.patch(
        f"{settings.API_V1_STR}/cellars/{test_cellar['id']}", json=update_data
    )
    assert response.status_code == 200

    updated_cellar = response.json()
    assert updated_cellar["name"] == update_data["name"]
    assert updated_cellar["sections"] == update_data["sections"]
    assert updated_cellar["id"] == test_cellar["id"]
    assert updated_cellar["user_id"] == test_cellar["user_id"]


def test_update_cellar_not_found(client):
    """Test updating a non-existent cellar"""
    non_existent_id = str(uuid4())
    update_data = {"name": "This should fail"}

    response = client.patch(
        f"{settings.API_V1_STR}/cellars/{non_existent_id}", json=update_data
    )
    assert response.status_code == 404


def test_delete_cellar(client, test_user_id):
    """Test deleting a cellar"""
    # First create a cellar
    cellar_data = {"name": "Cellar to Delete", "user_id": str(test_user_id)}

    create_response = client.post(f"{settings.API_V1_STR}/cellars/", json=cellar_data)
    assert create_response.status_code == 201
    cellar_id = create_response.json()["id"]

    # Then delete it
    delete_response = client.delete(f"{settings.API_V1_STR}/cellars/{cellar_id}")
    assert delete_response.status_code == 204

    # Verify it's gone
    get_response = client.get(f"{settings.API_V1_STR}/cellars/{cellar_id}")
    assert get_response.status_code == 404


def test_delete_cellar_not_found(client):
    """Test deleting a non-existent cellar"""
    non_existent_id = str(uuid4())
    response = client.delete(f"{settings.API_V1_STR}/cellars/{non_existent_id}")
    assert response.status_code == 404


def test_list_cellar_wines(client, test_cellar, test_cellar_wine):
    """Test listing wines in a cellar"""
    response = client.get(f"{settings.API_V1_STR}/cellars/{test_cellar['id']}/wines")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0

    # Check that our test cellar wine is in the list
    cellar_wine_ids = [cw["id"] for cw in data["items"]]
    assert test_cellar_wine["id"] in cellar_wine_ids

    # Check that each item has a wine property
    for item in data["items"]:
        assert "wine" in item
        assert isinstance(item["wine"], dict)


def test_get_cellar_statistics(client, test_cellar, test_cellar_wine):
    """Test getting cellar statistics"""
    response = client.get(
        f"{settings.API_V1_STR}/cellars/{test_cellar['id']}/statistics"
    )
    assert response.status_code == 200

    stats = response.json()
    assert "total_bottles" in stats
    assert "total_value" in stats
    assert "bottles_by_type" in stats
    assert "bottles_by_region" in stats
    assert "bottles_by_vintage" in stats

    # Since we added test wine, there should be bottles
    assert stats["total_bottles"] > 0

    # Verify the value calculation
    expected_value = test_cellar_wine["quantity"] * test_cellar_wine["purchase_price"]
    assert stats["total_value"] == expected_value


def test_get_cellar_wine(client, test_cellar_wine):
    """Test getting a specific cellar wine"""
    response = client.get(
        f"{settings.API_V1_STR}/cellars/wines/{test_cellar_wine['id']}"
    )
    assert response.status_code == 200

    cellar_wine = response.json()
    assert cellar_wine["id"] == test_cellar_wine["id"]
    assert cellar_wine["cellar_id"] == test_cellar_wine["cellar_id"]
    assert cellar_wine["wine_id"] == test_cellar_wine["wine_id"]
    assert "wine" in cellar_wine
    assert isinstance(cellar_wine["wine"], dict)


def test_add_wine_to_cellar(client, test_cellar, test_wine):
    """Test adding a wine to a cellar"""
    cellar_wine_data = {
        "cellar_id": test_cellar["id"],
        "wine_id": test_wine["id"],
        "quantity": 2,
        "purchase_price": 19.99,
        "size": "1.5L",
        "status": "in_stock",
    }

    response = client.post(
        f"{settings.API_V1_STR}/cellars/wines", json=cellar_wine_data
    )
    assert response.status_code == 201

    cellar_wine = response.json()
    assert cellar_wine["cellar_id"] == cellar_wine_data["cellar_id"]
    assert cellar_wine["wine_id"] == cellar_wine_data["wine_id"]
    assert cellar_wine["quantity"] == cellar_wine_data["quantity"]
    assert cellar_wine["purchase_price"] == cellar_wine_data["purchase_price"]
    assert cellar_wine["size"] == cellar_wine_data["size"]
    assert "id" in cellar_wine
    assert "created_at" in cellar_wine
    assert "updated_at" in cellar_wine
    assert "wine" in cellar_wine
    assert isinstance(cellar_wine["wine"], dict)


def test_update_cellar_wine(client, test_cellar_wine):
    """Test updating a cellar wine"""
    update_data = {"quantity": 5, "purchase_price": 29.99, "status": "reserved"}

    response = client.patch(
        f"{settings.API_V1_STR}/cellars/wines/{test_cellar_wine['id']}",
        json=update_data,
    )
    assert response.status_code == 200

    updated_cellar_wine = response.json()
    assert updated_cellar_wine["quantity"] == update_data["quantity"]
    assert updated_cellar_wine["purchase_price"] == update_data["purchase_price"]
    assert updated_cellar_wine["status"] == update_data["status"]
    assert updated_cellar_wine["id"] == test_cellar_wine["id"]
    assert updated_cellar_wine["cellar_id"] == test_cellar_wine["cellar_id"]
    assert updated_cellar_wine["wine_id"] == test_cellar_wine["wine_id"]


def test_remove_wine_from_cellar(client, test_cellar, test_wine):
    """Test removing a wine from a cellar"""
    # First add a wine to the cellar
    cellar_wine_data = {
        "cellar_id": test_cellar["id"],
        "wine_id": test_wine["id"],
        "quantity": 1,
    }

    add_response = client.post(
        f"{settings.API_V1_STR}/cellars/wines", json=cellar_wine_data
    )
    assert add_response.status_code == 201
    cellar_wine_id = add_response.json()["id"]

    # Then remove it
    remove_response = client.delete(
        f"{settings.API_V1_STR}/cellars/wines/{cellar_wine_id}"
    )
    assert remove_response.status_code == 204

    # Verify it's gone
    get_response = client.get(f"{settings.API_V1_STR}/cellars/wines/{cellar_wine_id}")
    assert get_response.status_code == 404
