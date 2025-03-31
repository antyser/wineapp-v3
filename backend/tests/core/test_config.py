"""
Tests for the core configuration module
"""

from src.core import settings


def test_settings():
    """
    Test that settings are loaded correctly
    """
    assert settings is not None
    # Check for test environment value since conftest.py sets ENVIRONMENT=development
    assert (
        settings.PROJECT_NAME == "Wine App API"
        or settings.PROJECT_NAME == "Wine App API Test"
    )
    assert settings.API_V1_STR == "/api/v1"
    assert settings.ENVIRONMENT == "development"
