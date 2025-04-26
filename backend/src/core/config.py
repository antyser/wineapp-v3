import json
import os
from enum import Enum
from typing import List, Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings



class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Wine App API"

    # Environment settings
    DEBUG: bool = True

    # Supabase - Let pydantic-settings load from environment
    SUPABASE_URL: Optional[str] = None # Or just `str` if always required
    SUPABASE_SERVICE_KEY: Optional[str] = None # Or just `str` if always required
    SUPABASE_DB_NAME: str = ""  # Keep if needed for tests, otherwise remove
    SUPABASE_KEY: Optional[str] = None # Still seems redundant? Consider removing

    # CORS
    # Parse BACKEND_CORS_ORIGINS from environment variable if available
    BACKEND_CORS_ORIGINS: List[str] = json.loads(
        os.getenv("BACKEND_CORS_ORIGINS", "[]")
    ) or [
        "http://localhost:8081",  # Frontend development server (current)
        "http://localhost:8083",  # Frontend development server
        "http://localhost:3000",  # Alternative frontend port
        "http://127.0.0.1:8081",  # Using IP instead of localhost (current)
        "http://127.0.0.1:8083",  # Using IP instead of localhost
        "http://127.0.0.1:3000",  # Alternative IP port
        "https://localhost:8081",  # HTTPS variants (current)
        "https://localhost:8083",  # HTTPS variants
        "https://localhost:3000",
        "https://127.0.0.1:8081",  # HTTPS IP variants (current)
        "https://127.0.0.1:8083",
        "https://127.0.0.1:3000",
        "exp://localhost:8081",  # Expo development server (current)
        "exp://localhost:8083",  # Expo development server
        "exp://127.0.0.1:8081",  # Expo IP (current)
        "exp://127.0.0.1:8083",
    ]

    # JWT
    SECRET_KEY: str = "dev_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # API keys for external services
    FIRECRAWL_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    LOGFIRE_API_KEY: Optional[str] = None

    class Config:
        case_sensitive = True
        extra = "allow" # Consider changing to "ignore" or "forbid"


# Create a singleton settings instance
settings = Settings()
print(settings.SUPABASE_URL)