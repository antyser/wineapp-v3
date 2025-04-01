"""
Tests for the Supabase connection module
"""

from src.core import get_supabase_client


def test_supabase_client():
    """
    Test that we can create a real Supabase client
    """
    client = get_supabase_client()
    assert client is not None

    # Test that we can query tables with the client
    table = client.table("wines")
    assert table is not None

    # Test that we can execute a query
    response = table.select("*").execute()
    assert hasattr(response, "data")
