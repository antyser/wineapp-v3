#!/usr/bin/env python
"""
Script to run the backend tests with pytest
"""
import os
import sys

import pytest


def main():
    """Run the tests"""
    # Set environment variables for testing
    os.environ["ENVIRONMENT"] = "test"
    os.environ["USE_MOCK_CLIENT"] = "true"
    
    # Add project root to PYTHONPATH to allow imports
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Run pytest with our arguments
    sys.exit(pytest.main(["backend/tests"]))

if __name__ == "__main__":
    main() 