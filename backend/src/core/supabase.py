import logging

from src.core.config import settings
from supabase import Client, create_client

# Configure logging
logger = logging.getLogger(__name__)

# Default local Supabase values for development
DEFAULT_LOCAL_URL = "http://127.0.0.1:54321"
DEFAULT_LOCAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
DEFAULT_LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"


def get_supabase_client() -> Client:
    """
    Returns a Supabase client with anonymous key (for user operations)
    """
    # Get the Supabase URL and key from environment or use defaults for development
    url = settings.SUPABASE_URL or (
        DEFAULT_LOCAL_URL if settings.is_development or settings.is_test else ""
    )
    key = settings.SUPABASE_ANON_KEY or (
        DEFAULT_LOCAL_KEY if settings.is_development or settings.is_test else ""
    )

    if not url or not key:
        error_msg = "Supabase URL and key must be provided in production environment"
        logger.error(error_msg)
        if settings.is_production:
            raise ValueError(error_msg)

    # Log connection info based on environment
    env_name = (
        "TEST"
        if settings.is_test
        else "DEVELOPMENT"
        if settings.is_development
        else "PRODUCTION"
    )
    logger.info(f"Connecting to Supabase ({env_name}) at {url}")

    # The database is configured at the Supabase service level and via environment variables
    # We don't need to set any schema options here
    try:
        # Create the client with default options
        client = create_client(url, key)

        # Test the connection in development/test mode
        if settings.is_development or settings.is_test:
            try:
                response = client.table("wines").select("*").limit(1).execute()
                logger.info(
                    f"Successfully connected to Supabase: {len(response.data)} records returned"
                )
                print(
                    f"Successfully connected to Supabase ({env_name}): {len(response.data)} records returned"
                )
            except Exception as e:
                logger.warning(f"Connected to Supabase but test query failed: {e}")
                print(f"Warning: Connected to Supabase but test query failed: {e}")

        return client
    except Exception as e:
        error_msg = f"Error connecting to Supabase: {e}"
        logger.error(error_msg)

        # In production, we want to fail fast
        if settings.is_production:
            raise

        # For development/test, return a client anyway as we'll test it during actual operations
        return create_client(url, key)


def get_supabase_admin_client() -> Client:
    """
    Returns a Supabase client with service role key (for admin operations)
    """
    # Get the Supabase URL and key from environment or use defaults for development
    url = settings.SUPABASE_URL or (
        DEFAULT_LOCAL_URL if settings.is_development or settings.is_test else ""
    )
    key = settings.SUPABASE_SERVICE_KEY or (
        DEFAULT_LOCAL_SERVICE_KEY if settings.is_development or settings.is_test else ""
    )

    if not url or not key:
        error_msg = (
            "Supabase URL and service key must be provided in production environment"
        )
        logger.error(error_msg)
        if settings.is_production:
            raise ValueError(error_msg)

    # The database is configured at the Supabase service level and via environment variables
    # We don't need to set any schema options here
    return create_client(url, key)
