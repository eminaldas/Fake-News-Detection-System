from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Fake News Detection System"
    VERSION: str = "1.0.0"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REMEMBER_ME_EXPIRE_DAYS: int = 30

    # Admin credentials — migration sonrası DB'ye taşınır
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "change-me-before-deploy"
    ADMIN_EMAIL: str = "admin@fnds.local"

    # Rate limiting
    RATE_LIMIT_ANON: int = 3
    RATE_LIMIT_USER: int = 20
    LOGIN_BRUTE_FORCE_MAX: int = 10
    LOGIN_BRUTE_FORCE_WINDOW_SECONDS: int = 600  # 10 dakika

    # Database
    DATABASE_URL: str
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "fnds"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_RATE_LIMIT: str = "10/s"
    NEWS_AGENT_INTERVAL: int = 60

    # NLP
    TRANSFORMER_MODEL: str = "emrecan/bert-base-turkish-cased-mean-nli-stsb-tr"
    SIMILARITY_THRESHOLD: float = 0.08

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
