import os
import sys
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Set the environment to test mode
os.environ["ENVIRONMENT"] = "test"
# Use real client for tests
os.environ["USE_MOCK_CLIENT"] = "false"

# Add the parent directory to sys.path for proper imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import after setting environment variables
from src.core import get_supabase_client, settings
from src.main import app


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
    For tests, this will return the real local Supabase client
    """
    return get_supabase_client() 