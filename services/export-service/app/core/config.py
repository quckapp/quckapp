"""Configuration settings for the Export Service."""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "export-service"
    DEBUG: bool = False
    PORT: int = 5015

    # Database
    DATABASE_URL: str = "mysql+asyncmy://quikapp:quikapp@localhost:3306/quikapp_exports"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "quikapp-exports"
    S3_PREFIX: str = "exports/"

    # Local Storage (fallback)
    LOCAL_STORAGE_PATH: str = "/tmp/exports"

    # Export Settings
    MAX_EXPORT_RECORDS: int = 1000000
    EXPORT_CHUNK_SIZE: int = 10000
    EXPORT_EXPIRY_HOURS: int = 168  # 7 days

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Service URLs
    MESSAGE_SERVICE_URL: str = "http://localhost:3000"
    USER_SERVICE_URL: str = "http://localhost:8082"
    AUDIT_SERVICE_URL: str = "http://localhost:8084"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
