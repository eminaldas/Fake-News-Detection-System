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
    NEWS_AGENT_INTERVAL: int = 900
    AUDIT_FLUSH_INTERVAL: int = 30

    # NLP
    TRANSFORMER_MODEL: str = "emrecan/bert-base-turkish-cased-mean-nli-stsb-tr"
    SIMILARITY_THRESHOLD: float = 0.08

    # Model Feedback Loop
    FEEDBACK_CONSENSUS_THRESHOLD: int   = 10    # env: FEEDBACK_CONSENSUS_THRESHOLD
    FEEDBACK_MAX_PROPORTION:      float = 0.15  # toplam training verisinin max %15'i
    FEEDBACK_CONFIDENCE_GUARD:    float = 0.80  # bu eşiğin üzerinde feedback kabul etme

    # RSS Ingest
    RSS_DEDUP_THRESHOLD: float = 0.15
    RSS_INGEST_QUEUE:    str   = "rss"
    RSS_INGEST_BATCH:    int   = 50

    CATEGORY_MAIN_THRESHOLD:  float = 0.55   # ana kategoriyi ezme eşiği
    CATEGORY_SUB_THRESHOLD:   float = 0.40   # alt kategori atama eşiği
    CATEGORY_CLASSIFY_BATCH:  int   = 20     # task başına haber sayısı
    CATEGORY_CLASSIFY_QUEUE:  str   = "classify"
    CATEGORY_SWEEP_MAX_AGE_H: int   = 1      # bu kadar saat önce eklenip hâlâ NULL olanlar süpürülür

    # Email — Brevo HTTP API (opsiyonel — boş bırakılırsa email devre dışı)
    BREVO_API_KEY: str = ""
    SMTP_FROM:     str = "noreply@fnds.local"

    # SMTP — artık kullanılmıyor, geriye uyumluluk için korundu
    SMTP_HOST:     str = ""
    SMTP_PORT:     int = 587
    SMTP_USER:     str = ""
    SMTP_PASSWORD: str = ""

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    BASE_URL:     str = "http://localhost:8000"

    # Google OAuth
    GOOGLE_CLIENT_ID:     str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Gemini AI
    GEMINI_API_KEY:         str   = ""
    GEMINI_MODEL:           str   = "gemini-2.5-flash"
    # Primary 503/aşırı yük verirse düşülen yedek model
    GEMINI_FALLBACK_MODEL:  str   = "gemini-2.5-flash"
    GEMINI_ESCALATION_LOW:  float = 0.40
    GEMINI_ESCALATION_HIGH: float = 0.65

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
