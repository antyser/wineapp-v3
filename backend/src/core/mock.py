"""
Mock Supabase client for testing and local development without a real Supabase instance
"""
import functools
import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union, cast

from pydantic import BaseModel

T = TypeVar('T')

class MockResponse(Generic[T]):
    """
    Simulates a Supabase response
    """
    def __init__(self, data: T, count: Optional[int] = None, error: Optional[str] = None):
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else 1)
        self.error = error

class MockTable:
    """
    Represents a table in the mock database
    """
    def __init__(self, name: str, data_store: Dict[str, List[Dict[str, Any]]]):
        self.name = name
        self.data_store = data_store
        self._query_builder = MockQueryBuilder(name, data_store)
        
    def select(self, columns: str = "*") -> "MockQueryBuilder":
        """
        Select columns from the table
        """
        return self._query_builder.select(columns)
    
    def insert(self, values: Union[Dict[str, Any], List[Dict[str, Any]]]) -> MockResponse:
        """
        Insert values into the table
        """
        return self._query_builder.insert(values).execute()
    
    def update(self, values: Dict[str, Any]) -> "MockQueryBuilder":
        """
        Update rows in the table
        """
        return self._query_builder.update(values)
    
    def delete(self) -> "MockQueryBuilder":
        """
        Delete rows from the table
        """
        return self._query_builder.delete()

class MockQueryBuilder:
    """
    Builds and executes queries on the mock database
    """
    def __init__(self, table_name: str, data_store: Dict[str, List[Dict[str, Any]]]):
        self.table_name = table_name
        self.data_store = data_store
        self.columns = "*"
        self.filters = []
        self.limit_val = None
        self.offset_val = None
        self.order_by_clauses = []
        self.operation = "select"
        self.values_to_insert = None
        self.values_to_update = None
    
    def select(self, columns: str = "*") -> "MockQueryBuilder":
        """
        Select columns from the table
        """
        self.operation = "select"
        self.columns = columns
        return self
    
    def insert(self, values: Union[Dict[str, Any], List[Dict[str, Any]]]) -> "MockQueryBuilder":
        """
        Insert values into the table
        """
        self.operation = "insert"
        self.values_to_insert = values if isinstance(values, list) else [values]
        return self
    
    def update(self, values: Dict[str, Any]) -> "MockQueryBuilder":
        """
        Update rows in the table
        """
        self.operation = "update"
        self.values_to_update = values
        return self
    
    def delete(self) -> "MockQueryBuilder":
        """
        Delete rows from the table
        """
        self.operation = "delete"
        return self
    
    def eq(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add equality filter
        """
        self.filters.append({"type": "eq", "column": column, "value": value})
        return self
    
    def neq(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add inequality filter
        """
        self.filters.append({"type": "neq", "column": column, "value": value})
        return self
    
    def gt(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add greater than filter
        """
        self.filters.append({"type": "gt", "column": column, "value": value})
        return self
    
    def lt(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add less than filter
        """
        self.filters.append({"type": "lt", "column": column, "value": value})
        return self
    
    def gte(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add greater than or equal filter
        """
        self.filters.append({"type": "gte", "column": column, "value": value})
        return self
    
    def lte(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add less than or equal filter
        """
        self.filters.append({"type": "lte", "column": column, "value": value})
        return self
    
    def is_(self, column: str, value: Any) -> "MockQueryBuilder":
        """
        Add IS filter (for NULL checks)
        """
        self.filters.append({"type": "is", "column": column, "value": value})
        return self
    
    def in_(self, column: str, values: List[Any]) -> "MockQueryBuilder":
        """
        Add IN filter
        """
        self.filters.append({"type": "in", "column": column, "value": values})
        return self
    
    def ilike(self, column: str, pattern: str) -> "MockQueryBuilder":
        """
        Add case-insensitive LIKE filter
        """
        self.filters.append({"type": "ilike", "column": column, "value": pattern})
        return self
    
    def like(self, column: str, pattern: str) -> "MockQueryBuilder":
        """
        Add case-sensitive LIKE filter
        """
        self.filters.append({"type": "like", "column": column, "value": pattern})
        return self
    
    def limit(self, count: int) -> "MockQueryBuilder":
        """
        Limit the number of results
        """
        self.limit_val = count
        return self
    
    def offset(self, count: int) -> "MockQueryBuilder":
        """
        Skip a number of results
        """
        self.offset_val = count
        return self
    
    def order(self, column: str, ascending: bool = True) -> "MockQueryBuilder":
        """
        Order results by a column
        """
        self.order_by_clauses.append({"column": column, "ascending": ascending})
        return self
    
    def _apply_filters(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply filters to the data
        """
        result = data
        for filter_dict in self.filters:
            filter_type = filter_dict["type"]
            column = filter_dict["column"]
            value = filter_dict["value"]
            
            if filter_type == "eq":
                result = [row for row in result if row.get(column) == value]
            elif filter_type == "neq":
                result = [row for row in result if row.get(column) != value]
            elif filter_type == "gt":
                result = [row for row in result if row.get(column) > value]
            elif filter_type == "lt":
                result = [row for row in result if row.get(column) < value]
            elif filter_type == "gte":
                result = [row for row in result if row.get(column) >= value]
            elif filter_type == "lte":
                result = [row for row in result if row.get(column) <= value]
            elif filter_type == "is":
                if value is None:
                    result = [row for row in result if column not in row or row[column] is None]
                else:
                    result = [row for row in result if row.get(column) is value]
            elif filter_type == "in":
                result = [row for row in result if row.get(column) in value]
            elif filter_type == "like":
                pattern = value.replace("%", ".*")
                import re
                regex = re.compile(f"^{pattern}$")
                result = [row for row in result if column in row and isinstance(row[column], str) and regex.match(row[column])]
            elif filter_type == "ilike":
                pattern = value.replace("%", ".*")
                import re
                regex = re.compile(f"^{pattern}$", re.IGNORECASE)
                result = [row for row in result if column in row and isinstance(row[column], str) and regex.match(row[column])]
        
        return result
    
    def _apply_order(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply ordering to the data
        """
        result = data
        for order_clause in reversed(self.order_by_clauses):
            column = order_clause["column"]
            ascending = order_clause["ascending"]
            result = sorted(result, key=lambda x: (x.get(column) is None, x.get(column)), reverse=not ascending)
        return result
    
    def _apply_limit_offset(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply limit and offset to the data
        """
        result = data
        if self.offset_val is not None:
            result = result[self.offset_val:]
        if self.limit_val is not None:
            result = result[:self.limit_val]
        return result
    
    def _select_columns(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Select only specified columns
        """
        if self.columns == "*":
            return data
        
        columns = [col.strip() for col in self.columns.split(",")]
        return [{col: row.get(col) for col in columns} for row in data]
    
    def execute(self) -> MockResponse:
        """
        Execute the query and return a response
        """
        # Make sure we have data for this table
        if self.table_name not in self.data_store:
            self.data_store[self.table_name] = []
        
        data = self.data_store[self.table_name]
        
        if self.operation == "select":
            result = self._apply_filters(data)
            result = self._apply_order(result)
            result = self._apply_limit_offset(result)
            result = self._select_columns(result)
            return MockResponse(result)
        
        elif self.operation == "insert":
            new_rows = []
            for values in self.values_to_insert:
                # Generate UUID if id is not provided
                if "id" not in values:
                    values["id"] = str(uuid.uuid4())
                new_row = values.copy()
                self.data_store[self.table_name].append(new_row)
                new_rows.append(new_row)
            return MockResponse(new_rows)
        
        elif self.operation == "update":
            rows_to_update = self._apply_filters(data)
            for row in rows_to_update:
                row.update(self.values_to_update)
            return MockResponse(rows_to_update)
        
        elif self.operation == "delete":
            rows_to_delete = self._apply_filters(data)
            for row in rows_to_delete:
                self.data_store[self.table_name].remove(row)
            return MockResponse(rows_to_delete)
        
        return MockResponse([], error="Invalid operation")

class MockSupabaseClient:
    """
    Mock client for Supabase that works without a real instance
    """
    def __init__(self):
        self.data_store = {}
        self._load_mock_data()
    
    def _load_mock_data(self):
        """
        Load mock data from JSON files
        """
        mock_data_dir = Path(__file__).parent / "mock_data"
        for file_path in mock_data_dir.glob("*.json"):
            table_name = file_path.stem
            try:
                with open(file_path, "r") as f:
                    self.data_store[table_name] = json.load(f)
            except Exception as e:
                print(f"Error loading mock data for {table_name}: {e}")
    
    def _save_mock_data(self):
        """
        Save mock data to JSON files
        """
        mock_data_dir = Path(__file__).parent / "mock_data"
        mock_data_dir.mkdir(exist_ok=True)
        for table_name, data in self.data_store.items():
            file_path = mock_data_dir / f"{table_name}.json"
            try:
                with open(file_path, "w") as f:
                    json.dump(data, f, indent=2)
            except Exception as e:
                print(f"Error saving mock data for {table_name}: {e}")
    
    def table(self, table_name: str) -> MockTable:
        """
        Get a table from the mock database
        """
        return MockTable(table_name, self.data_store)
    
    def rpc(self, function_name: str, params: Dict[str, Any] = None) -> MockResponse:
        """
        Mock remote procedure call
        """
        return MockResponse({"result": f"Mock RPC call to {function_name}"})
    
    def auth(self):
        """
        Mock auth methods
        """
        return {
            "sign_up": lambda params: {"user": {"id": str(uuid.uuid4()), "email": params.get("email")}},
            "sign_in": lambda params: {"user": {"id": "00000000-0000-0000-0000-000000000001", "email": params.get("email")}},
            "sign_out": lambda: {"error": None},
            "session": lambda: {"user": {"id": "00000000-0000-0000-0000-000000000001", "email": "test@example.com"}},
        }
    
    def storage(self):
        """
        Mock storage methods
        """
        return {
            "list": lambda bucket: {"data": [{"name": "mock_file.jpg"}]},
            "upload": lambda bucket, path, file: {"data": {"path": path}},
            "download": lambda bucket, path: b"mock_file_content",
            "get_public_url": lambda bucket, path: f"https://mock-storage.com/{bucket}/{path}",
        } 