import os
from typing import Optional

from supabase import Client, create_client

from .config import settings
from .mock import MockSupabaseClient

# Determine if we should use the mock client
# Use mock client if:
# 1. The USE_MOCK_CLIENT environment variable is set to "true"
# 2. We're in a test environment
# 3. The SUPABASE_URL or SUPABASE_ANON_KEY is not set
USE_MOCK_CLIENT = (
    os.getenv("USE_MOCK_CLIENT", "").lower() == "true"
    or settings.ENVIRONMENT == "test"
    or not settings.SUPABASE_URL
    or not settings.SUPABASE_ANON_KEY
)

def get_supabase_client() -> Client:
    """
    Returns a Supabase client with anonymous key (for user operations)
    
    If USE_MOCK_CLIENT is True, returns a mock client for testing and development
    without requiring a real Supabase instance.
    """
    if USE_MOCK_CLIENT:
        return MockSupabaseClient()
    
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_ANON_KEY
    
    if not url or not key:
        raise ValueError("Missing Supabase URL or anon key in environment variables")
    
    return create_client(url, key)

def get_supabase_admin_client() -> Client:
    """
    Returns a Supabase client with service role key (for admin operations)
    
    If USE_MOCK_CLIENT is True, returns a mock client for testing and development
    without requiring a real Supabase instance.
    """
    if USE_MOCK_CLIENT:
        return MockSupabaseClient()
    
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY
    
    if not url or not key:
        raise ValueError("Missing Supabase URL or service key in environment variables")
    
    return create_client(url, key) 