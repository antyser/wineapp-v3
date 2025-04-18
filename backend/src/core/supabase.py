import logging
import os

from supabase import Client, create_client

from src.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Default local Supabase values for development
DEFAULT_LOCAL_URL = "http://127.0.0.1:54321"
DEFAULT_DOCKER_URL = "http://supabase:54321"  # Docker container name
DEFAULT_LOCAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
DEFAULT_LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"


def get_supabase_client() -> Client:
    """
    Returns a Supabase client with service role key (for admin operations)
    """
    # Get the Supabase URL and key from environment or use defaults for development
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY

    # For development, use defaults if not provided
    if not url:
        # Check if we're running in Docker by checking for common Docker environment variables
        in_docker = os.path.exists("/.dockerenv") or os.environ.get(
            "DOCKER_CONTAINER", False
        )
        if in_docker:
            url = DEFAULT_DOCKER_URL
            logger.info(f"Using Docker Supabase URL: {url}")
        else:
            url = DEFAULT_LOCAL_URL
            logger.info(f"Using local Supabase URL: {url}")

    if not key:
        key = DEFAULT_LOCAL_SERVICE_KEY
        logger.info("Using default service key for development")

    # Check URL format
    if not url:
        error_msg = "Supabase URL must be provided"
        logger.error(error_msg)
        if settings.is_production:
            raise ValueError(error_msg)
        else:
            # Default for local dev
            url = DEFAULT_LOCAL_URL

    # Log the URL we're using (mask the key for security)
    logger.info(f"Connecting to Supabase at: {url}")

    # The database is configured at the Supabase service level and via environment variables
    # We don't need to set any schema options here
    return create_client(url, key)
