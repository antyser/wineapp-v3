import os
from typing import Optional

from supabase import Client, create_client

from .config import settings

# Default local Supabase values
DEFAULT_LOCAL_URL = "http://localhost:54321"
DEFAULT_LOCAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
DEFAULT_LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

def get_supabase_client() -> Client:
    """
    Returns a Supabase client with anonymous key (for user operations)
    """
    # Get the Supabase URL and key from environment or use defaults
    url = settings.SUPABASE_URL or DEFAULT_LOCAL_URL
    key = settings.SUPABASE_ANON_KEY or DEFAULT_LOCAL_KEY
    
    # Using print to help debug test connection issues
    if settings.ENVIRONMENT == "test":
        print(f"Connecting to Supabase at {url}")
    
    try:
        # Create the client
        client = create_client(url, key)
        
        # Optional: Test the connection in test mode
        if settings.ENVIRONMENT == "test":
            try:
                response = client.table("wines").select("*").limit(1).execute()
                print(f"Successfully connected to Supabase: {len(response.data)} records returned")
            except Exception as e:
                print(f"Warning: Connected to Supabase but test query failed: {e}")
        
        return client
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        # For tests, return a client anyway as we'll test it during actual operations
        return create_client(url, key)

def get_supabase_admin_client() -> Client:
    """
    Returns a Supabase client with service role key (for admin operations)
    """
    # Get the Supabase URL and key from environment or use defaults
    url = settings.SUPABASE_URL or DEFAULT_LOCAL_URL
    key = settings.SUPABASE_SERVICE_KEY or DEFAULT_LOCAL_SERVICE_KEY
    
    return create_client(url, key) 