from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "Fake News Detection System"
    VERSION: str = "1.0.0"

    # Security
    SECRET_KEY: str # Must be provided in .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str # Must be provided in .env
    REDIS_URL: str = "redis://localhost:6379/0" # Redis can have a default
    
    # NLP Engine
    TRANSFORMER_MODEL: str = "emrecan/bert-base-turkish-cased-mean-nli-stsb-tr"
    SIMILARITY_THRESHOLD: float = 0.08 # Default 92% similarity match
    CELERY_RATE_LIMIT: str = "10/s" # Default anti-OOM limit

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
