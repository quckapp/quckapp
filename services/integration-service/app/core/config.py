"""Configuration settings for the Integration Service."""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "integration-service"
    DEBUG: bool = False
    PORT: int = 5016
    BASE_URL: str = "http://localhost:5016"

    # Database
    DATABASE_URL: str = "mysql+asyncmy://quikapp:quikapp@localhost:3306/quikapp_integrations"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Encryption key for storing OAuth tokens
    ENCRYPTION_KEY: str = "your-32-byte-encryption-key-here!"

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:5016/api/v1/oauth/github/callback"

    # Jira/Atlassian OAuth
    JIRA_CLIENT_ID: str = ""
    JIRA_CLIENT_SECRET: str = ""
    JIRA_REDIRECT_URI: str = "http://localhost:5016/api/v1/oauth/jira/callback"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5016/api/v1/oauth/google/callback"

    # Webhook secrets
    GITHUB_WEBHOOK_SECRET: str = ""
    JIRA_WEBHOOK_SECRET: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
