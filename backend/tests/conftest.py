import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Set the environment to test mode
os.environ["ENVIRONMENT"] = "test"
# Use mock client for tests by default
os.environ["USE_MOCK_CLIENT"] = "true"

# Import after setting environment variables
from backend.src.core import get_supabase_client, settings
from backend.src.main import app  # We'll create this file next


@pytest.fixture
def client() -> Generator:
    """
    Create a test client for the FastAPI app
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def supabase():
    """
    Create a Supabase client for testing
    For tests, this will return the mock client
    """
    return get_supabase_client() 