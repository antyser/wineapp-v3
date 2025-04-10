import os
import time
from unittest.mock import MagicMock

import pytest
from dotenv import load_dotenv
from fastapi import Request
from starlette.datastructures import Headers

from src.auth.utils import SupabaseAuth, get_optional_user
from src.core import get_supabase_client
from supabase import create_client

# Load environment variables from .env file
load_dotenv()


# Skip all tests in this module if environment variables are not set
pytestmark = pytest.mark.skipif(
    "SUPABASE_URL" not in os.environ
    or "SUPABASE_KEY" not in os.environ
    or "SUPABASE_TEST_EMAIL" not in os.environ
    or "SUPABASE_TEST_PASSWORD" not in os.environ,
    reason="Supabase credentials or test user not provided",
)


@pytest.fixture(scope="module")
def supabase_client():
    """
    Create a Supabase client for testing.

    This uses the SUPABASE_URL and SUPABASE_KEY environment variables.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    return create_client(url, key)


@pytest.fixture(scope="module")
async def supabase_token(supabase_client):
    """
    Get a real JWT token from Supabase by signing in with test credentials.

    This requires SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD environment variables.
    """
    email = os.environ.get("SUPABASE_TEST_EMAIL")
    password = os.environ.get("SUPABASE_TEST_PASSWORD")

    # Sign in to get access token
    response = supabase_client.auth.sign_in_with_password(
        {"email": email, "password": password}
    )

    # Return the access token
    return response.session.access_token


@pytest.mark.asyncio
async def test_verify_real_supabase_token(supabase_token):
    """Test that we can verify a real Supabase JWT token."""
    # Create a mock request with the real token
    mock_request = MagicMock(spec=Request)
    mock_request.headers = Headers({"Authorization": f"Bearer {supabase_token}"})

    # Create SupabaseAuth instance
    auth = SupabaseAuth()

    # Verify the token
    result = await auth(mock_request)

    # Check that we got user info back
    assert "user_id" in result
    assert "email" in result
    assert result["role"] == "authenticated"


@pytest.mark.asyncio
async def test_optional_user_with_real_token(supabase_token):
    """Test that get_optional_user works with a real token."""
    # Create a mock request with the real token
    mock_request = MagicMock(spec=Request)
    mock_request.headers = Headers({"Authorization": f"Bearer {supabase_token}"})

    # Call get_optional_user
    result = get_optional_user(mock_request)

    # Check that we got a UUID back
    assert result is not None


@pytest.mark.asyncio
async def test_client_connection():
    """Test that we can connect to Supabase and query a table."""
    client = get_supabase_client()

    # Try a simple query
    response = client.table("wines").select("count").limit(1).execute()

    # Verify we got a response
    assert hasattr(response, "data")
