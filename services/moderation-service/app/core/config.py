from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "moderation-service"
    PORT: int = 5014
    DEBUG: bool = False

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "password"
    DB_NAME: str = "quikapp_moderation"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # ML Model
    MODEL_NAME: str = "facebook/roberta-hate-speech-dynabench-r4-target"
    TOXICITY_THRESHOLD: float = 0.7

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
