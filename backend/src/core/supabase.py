import logging
import os

from supabase import Client, create_client

from src.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Default local Supabase values for development
DEFAULT_LOCAL_URL = "http://127.0.0.1:54321"
DEFAULT_DOCKER_URL = "http://supabase:54321"  # Docker container name


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
