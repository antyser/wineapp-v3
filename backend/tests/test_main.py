"""
Tests for the main application endpoints
"""
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """
    Test the root endpoint returns a welcome message
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Wine App API" in data["message"]


def test_health_endpoint(client: TestClient):
    """
    Test the health endpoint
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_supabase_connection(client: TestClient):
    """
    Test the Supabase connection endpoint
    """
    response = client.get("/api/v1/test-supabase")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "Successfully connected" in data["message"] 