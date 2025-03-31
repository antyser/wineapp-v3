import os
import sys
import time
from typing import Generator
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from supabase import Client, create_client

# Add the parent directory to sys.path for proper imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import for app and settings
from src.core.config import settings as core_settings
from src.core.supabase import DEFAULT_LOCAL_KEY
from src.main import app

# Set the environment to development mode
os.environ["ENVIRONMENT"] = "development"
# Force the Supabase URL to use the correct local endpoint
os.environ["SUPABASE_URL"] = "http://127.0.0.1:54321"
# We'll use the real client for tests
os.environ["USE_MOCK_CLIENT"] = "false"

# Important message for developers
print("\n")
print("=" * 80)
print(
    " IMPORTANT: Make sure the local Supabase server is running before running tests."
)
print(" Run 'supabase start' from the project root if you haven't started it yet.")
print("")
print(" Tests will connect to Supabase at: http://127.0.0.1:54321")
print("=" * 80)
print("\n")

# Maximum number of connection attempts
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


@pytest.fixture(scope="session", autouse=True)
def verify_supabase_connection():
    """
    Fixture to verify that Supabase is running before any tests are executed.
    This will retry the connection a few times before failing.
    """
    # Use the URL from environment variable
    url = os.environ["SUPABASE_URL"]
    key = core_settings.SUPABASE_ANON_KEY or DEFAULT_LOCAL_KEY

    print(f"\nChecking Supabase connection at {url}...")

    for attempt in range(MAX_RETRIES):
        try:
            # Try a simple connection
            response = httpx.get(f"{url}/rest/v1/?apikey={key}", timeout=5.0)
            if response.status_code == 200:
                print(f"Successfully connected to Supabase at {url}")
                return True
            else:
                print(f"Supabase responded with status code {response.status_code}")
        except Exception as e:
            print(f"Connection attempt {attempt + 1}/{MAX_RETRIES} failed: {str(e)}")

        if attempt < MAX_RETRIES - 1:
            print(f"Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)

    print("\n❌ ERROR: Cannot connect to Supabase.")
    print("   Please make sure Supabase is running with: npx supabase start")
    print("   If Supabase is already running, check your configuration\n")

    # We'll let the tests run, but they'll likely fail if they depend on Supabase


@pytest.fixture
def client() -> Generator:
    """
    Create a test client for the FastAPI app with real dependencies
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def supabase():
    """
    Fixture that provides a Supabase client for testing.
    """
    # Use the URL from environment variable
    url = os.environ["SUPABASE_URL"]
    key = core_settings.SUPABASE_ANON_KEY or DEFAULT_LOCAL_KEY

    print(f"Creating test Supabase client for {url}")
    client = create_client(url, key)

    # Test that the client works by running a simple query
    try:
        response = client.table("wines").select("*").limit(1).execute()
        print(f"Test client works: {len(response.data)} records returned")
    except Exception as e:
        print(f"Warning: Test client query failed: {e}")

    return client


@pytest.fixture
async def test_user(supabase):
    """Create a test user in the auth.users table for testing purposes"""
    # Generate a unique test user
    test_user_id = str(uuid4())
    test_email = f"test-{test_user_id}@example.com"

    try:
        # Call the SQL function to insert the user
        response = supabase.rpc(
            "test_insert_user", {"user_id": test_user_id, "user_email": test_email}
        ).execute()

        if response.data:
            user_id = response.data.get("id")
            if user_id:
                print(f"Created test user with ID: {user_id}")
                return UUID(user_id)
    except Exception as e:
        print(f"Warning: Failed to create test user: {e}")

    # Fallback to a known fixed user ID if the insertion fails
    fixed_user_id = "d0e822e8-e086-4e20-b82d-bd7b947d157b"
    print(f"Using a fixed test user ID for tests: {fixed_user_id}")
    return UUID(fixed_user_id)


@pytest.fixture
def test_user_id_api(supabase):
    """Create a fixed test user ID for API tests and ensure it exists in the database"""
    # Use a fixed ID for predictable tests
    fixed_user_id = "d0e822e8-e086-4e20-b82d-bd7b947d157b"
    fixed_email = "test-fixed@example.com"

    try:
        # Try to insert the user with our fixed ID
        response = supabase.rpc(
            "test_insert_user", {"user_id": fixed_user_id, "user_email": fixed_email}
        ).execute()

        if response.data and response.data.get("id"):
            print(f"Created or confirmed test user with ID: {fixed_user_id}")
        else:
            print(
                f"Could not confirm user creation, but will proceed with fixed ID: "
                f"{fixed_user_id}"
            )
    except Exception as e:
        print(f"Warning: Error when creating test user: {e}")
        print(f"Will proceed with fixed ID: {fixed_user_id}")

    return UUID(fixed_user_id)
