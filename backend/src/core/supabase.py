import logging

from supabase import Client, create_client

from src.core.config import settings

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
