import os
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Wine App API"

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
    SUPABASE_ANON_KEY: str = ""  # Public/anon key
    SUPABASE_SERVICE_KEY: str = ""  # Service role key (for admin operations)
    SUPABASE_DB_NAME: str = ""  # Database name (for test environment)
    SUPABASE_KEY: Optional[str] = None  # For backwards compatibility

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:8083",  # Frontend development server
        "http://localhost:3000",  # Alternative frontend port
        "http://127.0.0.1:8083",  # Using IP instead of localhost
        "http://127.0.0.1:3000",  # Alternative IP port
        "https://localhost:8083",  # HTTPS variants
        "https://localhost:3000",
        "https://127.0.0.1:8083",
        "https://127.0.0.1:3000",
        "exp://localhost:8083",  # Expo development server
        "exp://127.0.0.1:8083",
    ]

    # JWT
    SECRET_KEY: str = "dev_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Environment - supporting 'development', 'test' and 'production'
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # API keys for external services
    FIRECRAWL_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    LOGFIRE_API_KEY: Optional[str] = None

    @property
    def is_development(self) -> bool:
        """Check if current environment is development."""
        return self.ENVIRONMENT == "development"

    @property
    def is_test(self) -> bool:
        """Check if current environment is test."""
        return self.ENVIRONMENT == "test"

    @property
    def is_production(self) -> bool:
        """Check if current environment is production."""
        return self.ENVIRONMENT == "production"

    class Config:
        # Choose the right .env file based on environment
        env_file = (
            f".env.{os.getenv('ENVIRONMENT', 'development')}"
            if os.path.exists(f".env.{os.getenv('ENVIRONMENT', 'development')}")
            else ".env"
        )
        case_sensitive = True
        extra = "allow"  # Allow extra fields in settings


settings = Settings()
