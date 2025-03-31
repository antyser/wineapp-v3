"""
Tests for the Supabase connection module
"""
import pytest

from backend.src.core import get_supabase_client


def test_supabase_client():
    """
    Test that we can create a Supabase client
    For tests, this should be a mock client
    """
    client = get_supabase_client()
    assert client is not None
    
    # Test that we can access the mock data store in tests
    assert hasattr(client, 'data_store')
    
    # Test that we can query tables with the client
    table = client.table("wines")
    assert table is not None
    
    # Test that we can execute a query
    response = table.select("*").execute()
    assert hasattr(response, 'data') 