"""Configuration settings for the Insights Service."""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "insights-service"
    DEBUG: bool = False
    PORT: int = 5018

    # Database
    DATABASE_URL: str = "mysql+asyncmy://quikapp:quikapp@localhost:3306/quikapp_insights"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    # Cache TTL (seconds)
    CACHE_TTL_SHORT: int = 300  # 5 minutes
    CACHE_TTL_MEDIUM: int = 1800  # 30 minutes
    CACHE_TTL_LONG: int = 3600  # 1 hour
    CACHE_TTL_DAILY: int = 86400  # 24 hours

    # Service URLs
    USER_SERVICE_URL: str = "http://localhost:8082"
    MESSAGE_SERVICE_URL: str = "http://localhost:3000"
    AUTH_SERVICE_URL: str = "http://localhost:8081"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Report Settings
    MAX_REPORT_DAYS: int = 365
    DEFAULT_REPORT_DAYS: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
