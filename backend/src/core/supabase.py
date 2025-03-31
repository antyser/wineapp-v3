import os
from typing import Optional

from supabase import Client, create_client

from .config import settings


def get_supabase_client() -> Client:
    """
    Returns a Supabase client with anonymous key (for user operations)
    """
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_ANON_KEY
    
    if not url or not key:
        raise ValueError("Missing Supabase URL or anon key in environment variables")
    
    return create_client(url, key)

def get_supabase_admin_client() -> Client:
    """
    Returns a Supabase client with service role key (for admin operations)
    """
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY
    
    if not url or not key:
        raise ValueError("Missing Supabase URL or service key in environment variables")
    
    return create_client(url, key) 