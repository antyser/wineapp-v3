import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Wine App API"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""  # Public/anon key
    SUPABASE_SERVICE_KEY: str = ""  # Service role key (for admin operations)
    SUPABASE_DB_NAME: str = ""  # Database name (for test environment)

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # JWT
    SECRET_KEY: str = "dev_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Environment - supporting 'development', 'test' and 'production'
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

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


settings = Settings()
