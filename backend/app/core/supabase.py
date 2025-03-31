import json
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union

from app.core.config import settings
from fastapi import Depends

from supabase import Client, create_client

# Global flag to indicate if we're using a mock client
USE_MOCK_CLIENT = settings.SUPABASE_URL == "" or os.getenv("USE_MOCK_CLIENT", "").lower() == "true"

class MockSupabaseClient:
    """
    Mock implementation of Supabase client for local development
    """
    def __init__(self):
        self.data_store = {
            "wines": [],
            "cellars": [],
            "wine_cellar_entries": [],
            "tasting_notes": [],
            "wishlist": []
        }
        self._load_mock_data()

    def _load_mock_data(self):
        """Load mock data from local JSON files if they exist"""
        try:
            mock_data_path = os.path.join(os.path.dirname(__file__), "../mock_data")
            for table in self.data_store.keys():
                file_path = os.path.join(mock_data_path, f"{table}.json")
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        self.data_store[table] = json.load(f)
        except Exception as e:
            print(f"Error loading mock data: {e}")

    def _save_mock_data(self):
        """Save mock data to local JSON files"""
        try:
            mock_data_path = os.path.join(os.path.dirname(__file__), "../mock_data")
            os.makedirs(mock_data_path, exist_ok=True)
            for table, data in self.data_store.items():
                file_path = os.path.join(mock_data_path, f"{table}.json")
                with open(file_path, 'w') as f:
                    json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving mock data: {e}")

    def table(self, table_name: str):
        """Mock implementation of table method"""
        return MockTable(self, table_name)

class MockQueryBuilder:
    """Mock implementation of Supabase query builder"""
    def __init__(self, client: MockSupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
        self.filters = []
        self.range_filter = None
        self.sort_clauses = []
        self.select_columns = "*"

    def select(self, columns: str):
        """Mock implementation of select method"""
        self.select_columns = columns
        return self

    def eq(self, column: str, value: Any):
        """Mock implementation of eq method"""
        self.filters.append(("eq", column, value))
        return self

    def in_(self, column: str, values: List[Any]):
        """Mock implementation of in_ method"""
        self.filters.append(("in", column, values))
        return self

    def range(self, start: int, end: int):
        """Mock implementation of range method"""
        self.range_filter = (start, end)
        return self

    def order(self, column: str, desc: bool = False):
        """Mock implementation of order method"""
        self.sort_clauses.append((column, desc))
        return self

    def single(self):
        """Mock implementation of single method"""
        return self

    def execute(self):
        """Mock implementation of execute method"""
        # Apply filters
        results = self.client.data_store.get(self.table_name, [])
        
        for filter_type, column, value in self.filters:
            if filter_type == "eq":
                results = [r for r in results if r.get(column) == value]
            elif filter_type == "in":
                results = [r for r in results if r.get(column) in value]
        
        # Apply sorting
        for column, desc in self.sort_clauses:
            results = sorted(results, key=lambda x: x.get(column), reverse=desc)
        
        # Apply range filter
        if self.range_filter:
            start, end = self.range_filter
            results = results[start:end]
        
        return MockResponse(results)

    def insert(self, values: Union[Dict[str, Any], List[Dict[str, Any]]]):
        """Mock implementation of insert method"""
        table_data = self.client.data_store.get(self.table_name, [])
        
        if isinstance(values, dict):
            values = [values]
        
        for value in values:
            table_data.append(value)
        
        self.client.data_store[self.table_name] = table_data
        self.client._save_mock_data()
        
        return MockResponse(values)

    def update(self, values: Dict[str, Any]):
        """Mock implementation of update method"""
        filtered_results = self.execute().data
        table_data = self.client.data_store.get(self.table_name, [])
        
        for i, item in enumerate(table_data):
            for result in filtered_results:
                if all(item.get(f[1]) == f[2] for f in self.filters if f[0] == "eq"):
                    for key, value in values.items():
                        if key != "id":  # Preserve ID
                            table_data[i][key] = value
        
        self.client.data_store[self.table_name] = table_data
        self.client._save_mock_data()
        
        return MockResponse(filtered_results)

    def delete(self):
        """Mock implementation of delete method"""
        filtered_results = self.execute().data
        table_data = self.client.data_store.get(self.table_name, [])
        
        new_table_data = [
            item for item in table_data 
            if not all(item.get(f[1]) == f[2] for f in self.filters if f[0] == "eq")
        ]
        
        self.client.data_store[self.table_name] = new_table_data
        self.client._save_mock_data()
        
        return MockResponse(filtered_results)

class MockTable:
    """Mock implementation of Supabase table"""
    def __init__(self, client: MockSupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
        
    def select(self, columns: str):
        """Mock implementation of select method"""
        return MockQueryBuilder(self.client, self.table_name).select(columns)
        
    def insert(self, values: Union[Dict[str, Any], List[Dict[str, Any]]]):
        """Mock implementation of insert method"""
        return MockQueryBuilder(self.client, self.table_name).insert(values)
        
    def update(self, values: Dict[str, Any]):
        """Mock implementation of update method"""
        return MockQueryBuilder(self.client, self.table_name).update(values)
        
    def delete(self):
        """Mock implementation of delete method"""
        return MockQueryBuilder(self.client, self.table_name).delete()

class MockResponse:
    """Mock implementation of Supabase response"""
    def __init__(self, data: Any):
        self.data = data

@lru_cache
def get_supabase_client() -> Union[Client, MockSupabaseClient]:
    """
    Create and cache Supabase client with anon key
    """
    if USE_MOCK_CLIENT:
        print("Using mock Supabase client")
        return MockSupabaseClient()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

@lru_cache
def get_supabase_admin_client() -> Union[Client, MockSupabaseClient]:
    """
    Create and cache Supabase client with service role key for admin operations
    """
    if USE_MOCK_CLIENT:
        print("Using mock Supabase admin client")
        return MockSupabaseClient()
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