from functools import lru_cache

from app.core.config import settings
from fastapi import Depends
from supabase import Client, create_client


@lru_cache
def get_supabase_client() -> Client:
    """
    Create and cache Supabase client with anon key
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

@lru_cache
def get_supabase_admin_client() -> Client:
    """
    Create and cache Supabase client with service role key for admin operations
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def get_supabase():
    """
    Dependency to get Supabase client
    """
    return get_supabase_client()

def get_supabase_admin():
    """
    Dependency to get Supabase admin client
    """
    return get_supabase_admin_client() 