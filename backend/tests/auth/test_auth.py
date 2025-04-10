import json
import os
import time
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from starlette.datastructures import Headers

from src.auth.utils import SupabaseAuth, get_current_user, get_optional_user
from src.core import get_supabase_client


# Create a test fixture for a mock request with valid JWT
@pytest.fixture
def create_mock_request():
    """
    Creates a mock request with the provided authorization header.

    This is a factory fixture that returns a function to create a mock request.
    """

    def _create_mock_request(auth_header=None):
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header

        mock_request = MagicMock(spec=Request)
        mock_request.headers = Headers(headers)
        return mock_request

    return _create_mock_request


# Test SupabaseAuth with valid token
@pytest.mark.asyncio
async def test_supabase_auth_valid_token():
    """Test SupabaseAuth with a valid token by mocking jwt.decode to return valid payload."""

    # Create a valid mock token payload
    valid_payload = {
        "iss": "https://xyzpdq.supabase.co",
        "sub": str(uuid.uuid4()),
        "exp": int(time.time()) + 3600,  # 1 hour from now
        "email": "test@example.com",
        "role": "authenticated",
    }

    # Create a mock token
    mock_token = "valid.jwt.token"

    # Mock request with Authorization header
    mock_request = MagicMock(spec=Request)
    mock_request.headers = Headers({"Authorization": f"Bearer {mock_token}"})

    # Create mock HTTPAuthorizationCredentials
    mock_credentials = MagicMock()
    mock_credentials.credentials = mock_token

    # Create instance of SupabaseAuth
    auth = SupabaseAuth()

    # Mock super().__call__ to return mock_credentials
    with patch.object(HTTPBearer, "__call__", AsyncMock(return_value=mock_credentials)):
        # Mock jwt.decode to return our valid payload
        with patch("jwt.decode", return_value=valid_payload):
            # Mock get_supabase_client
            with patch("src.auth.utils.get_supabase_client"):
                # Call the auth instance
                result = await auth(mock_request)

                # Check the result contains expected user info
                assert result["user_id"] == valid_payload["sub"]
                assert result["email"] == valid_payload["email"]
                assert result["role"] == valid_payload["role"]


# Test SupabaseAuth with expired token
@pytest.mark.asyncio
async def test_supabase_auth_expired_token():
    """Test SupabaseAuth with an expired token."""

    # Create an expired token payload
    expired_payload = {
        "iss": "https://xyzpdq.supabase.co",
        "sub": str(uuid.uuid4()),
        "exp": int(time.time()) - 3600,  # 1 hour ago
        "email": "test@example.com",
    }

    # Create a mock token
    mock_token = "expired.jwt.token"

    # Mock request with Authorization header
    mock_request = MagicMock(spec=Request)
    mock_request.headers = Headers({"Authorization": f"Bearer {mock_token}"})

    # Create mock HTTPAuthorizationCredentials
    mock_credentials = MagicMock()
    mock_credentials.credentials = mock_token

    # Create instance of SupabaseAuth
    auth = SupabaseAuth()

    # Mock super().__call__ to return mock_credentials
    with patch.object(HTTPBearer, "__call__", AsyncMock(return_value=mock_credentials)):
        # Mock jwt.decode to return our expired payload
        with patch("jwt.decode", return_value=expired_payload):
            # Call the auth instance and expect HTTPException
            with pytest.raises(HTTPException) as exc_info:
                await auth(mock_request)

            # Check the exception status code is 401
            assert exc_info.value.status_code == 401
            assert "Token expired" in exc_info.value.detail


# Test SupabaseAuth with invalid issuer
@pytest.mark.asyncio
async def test_supabase_auth_invalid_issuer():
    """Test SupabaseAuth with a token from an invalid issuer."""

    # Create a payload with invalid issuer
    invalid_payload = {
        "iss": "https://not-supabase.example.com",
        "sub": str(uuid.uuid4()),
        "exp": int(time.time()) + 3600,
        "email": "test@example.com",
    }

    # Create a mock token
    mock_token = "invalid.jwt.token"

    # Mock request with Authorization header
    mock_request = MagicMock(spec=Request)
    mock_request.headers = Headers({"Authorization": f"Bearer {mock_token}"})

    # Create mock HTTPAuthorizationCredentials
    mock_credentials = MagicMock()
    mock_credentials.credentials = mock_token

    # Create instance of SupabaseAuth
    auth = SupabaseAuth()

    # Mock super().__call__ to return mock_credentials
    with patch.object(HTTPBearer, "__call__", AsyncMock(return_value=mock_credentials)):
        # Mock jwt.decode to return our invalid payload
        with patch("jwt.decode", return_value=invalid_payload):
            # Call the auth instance and expect HTTPException
            with pytest.raises(HTTPException) as exc_info:
                await auth(mock_request)

            # Check the exception status code is 401
            assert exc_info.value.status_code == 401
            assert "Not a valid Supabase token" in exc_info.value.detail


# Test get_current_user dependency
@pytest.mark.asyncio
async def test_get_current_user():
    """Test get_current_user dependency."""

    # Create test UUID
    test_uuid = uuid.uuid4()

    # Create auth data with user_id
    auth_data = {"user_id": str(test_uuid)}

    # Call get_current_user with auth_data
    result = get_current_user(auth_data)

    # Check result is UUID and matches test_uuid
    assert isinstance(result, uuid.UUID)
    assert result == test_uuid


# Test get_optional_user with valid token
@pytest.mark.asyncio
async def test_get_optional_user_valid_token(create_mock_request):
    """Test get_optional_user with a valid token."""

    # Create a valid user ID
    test_uuid = uuid.uuid4()

    # Create a valid token payload
    valid_payload = {
        "iss": "https://xyzpdq.supabase.co",
        "sub": str(test_uuid),
        "exp": int(time.time()) + 3600,
    }

    # Create a mock token
    mock_token = "valid.jwt.token"

    # Create a mock request with Authorization header
    mock_request = create_mock_request(f"Bearer {mock_token}")

    # Mock jwt.decode to return our valid payload
    with patch("jwt.decode", return_value=valid_payload):
        # Call get_optional_user
        result = get_optional_user(mock_request)

        # Check result is UUID and matches test_uuid
        assert isinstance(result, uuid.UUID)
        assert result == test_uuid


# Test get_optional_user with no token
@pytest.mark.asyncio
async def test_get_optional_user_no_token(create_mock_request):
    """Test get_optional_user with no token."""

    # Create a mock request with no Authorization header
    mock_request = create_mock_request()

    # Call get_optional_user
    result = get_optional_user(mock_request)

    # Check result is None
    assert result is None


# Optional: If environment variables are set, test with real Supabase client
@pytest.mark.skipif(
    "SUPABASE_URL" not in os.environ or "SUPABASE_KEY" not in os.environ,
    reason="Supabase credentials not provided",
)
@pytest.mark.asyncio
async def test_with_real_supabase():
    """Test authentication with a real Supabase client if credentials are provided."""

    # This test would require a real Supabase JWT token
    # In a real test environment, you would need to create a test user and get their token

    # For now, just test that we can connect to Supabase
    client = get_supabase_client()

    # Try a simple query
    response = client.table("wines").select("*").limit(1).execute()

    # Verify we got a response
    assert hasattr(response, "data")
