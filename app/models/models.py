import uuid
import enum

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, Enum, Float, ForeignKey,
    Index, Integer, String, Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class UserRole(str, enum.Enum):
    admin = "admin"
    user  = "user"


class AnalysisType(str, enum.Enum):
    text  = "text"
    url   = "url"
    image = "image"


class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    username        = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    is_active       = Column(Boolean, nullable=False, default=True)
    preferences     = Column(JSONB, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at   = Column(DateTime(timezone=True), nullable=True)

    analysis_requests = relationship("AnalysisRequest", back_populates="user")


class AnalysisRequest(Base):
    __tablename__ = "analysis_requests"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    ip_hash       = Column(String(64), nullable=False)
    analysis_type = Column(Enum(AnalysisType), nullable=False)
    task_id       = Column(String(255), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="analysis_requests")


class Source(Base):
    __tablename__ = "sources"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name              = Column(String(255), nullable=False)
    url               = Column(String(512), unique=True, nullable=False)
    credibility_score = Column(String(50), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    articles = relationship("Article", back_populates="source")


class Article(Base):
    __tablename__ = "articles"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title         = Column(String(512), nullable=False)
    raw_content   = Column(Text, nullable=True)
    content       = Column(Text, nullable=False)
    source_id     = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True)
    embedding     = Column(Vector(768))
    metadata_info = Column(JSONB, nullable=True)
    status        = Column(String(50), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    source          = relationship("Source", back_populates="articles")
    analysis_result = relationship("AnalysisResult", back_populates="article", uselist=False)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False, unique=True)
    status     = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)
    signals    = Column(JSONB, nullable=True)
    ai_comment = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", back_populates="analysis_result")


class ImageCache(Base):
    __tablename__ = "image_cache"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phash         = Column(String(64), nullable=False, index=True)   # 64-bit perceptual hash (hex)
    exif_flags    = Column(JSONB, nullable=True)                      # {"Software": "Midjourney", ...}
    gemini_result = Column(JSONB, nullable=True)                      # Layer 3 Gemini analiz sonucu
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title        = Column(Text, nullable=False)
    content      = Column(Text, nullable=True)
    embedding    = Column(Vector(768), nullable=True)
    category     = Column(String(50),  nullable=True)   # "spor"
    subcategory  = Column(String(50),  nullable=True)   # "futbol"
    image_url    = Column(Text, nullable=True)
    source_name  = Column(String(100), nullable=True)   # "NTV"
    source_url   = Column(Text, nullable=True)          # orijinal makale linki
    trust_score  = Column(Float, nullable=True)         # 0.5 – 1.0
    pub_date     = Column(DateTime(timezone=True), nullable=True)
    cluster_id   = Column(UUID(as_uuid=True), nullable=True, index=True)
    source_count = Column(Integer, nullable=False, default=1)
    label        = Column(String(20),  nullable=True)   # "FAKE"/"AUTHENTIC"/"IDDIA"/NULL
    label_source = Column(String(50),  nullable=True)   # "teyit"/"gemini_batch"/NULL
    nlp_score    = Column(Float,   nullable=True)        # 0.0–1.0
    nlp_signals  = Column(JSONB,   nullable=True)        # {title:{...}, content:{...}}
    content_type = Column(JSONB,   nullable=True)        # ["claim","clickbait"] vb.
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type      = Column(String(50),  nullable=False)
    event_name      = Column(String(100), nullable=False, index=True)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_hash         = Column(String(64),  nullable=False, index=True)
    session_id      = Column(String(128), nullable=True)
    path            = Column(String(255), nullable=True)
    http_method     = Column(String(10),  nullable=True)
    status_code     = Column(Integer,     nullable=True)
    process_time_ms = Column(Float,       nullable=True)
    severity        = Column(String(20),  nullable=False, server_default="INFO")
    details         = Column(JSONB,       nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('SECURITY','USER_ACTION','SYSTEM')",
            name="ck_audit_event_type",
        ),
        CheckConstraint(
            "severity IN ('INFO','WARNING','CRITICAL')",
            name="ck_audit_severity",
        ),
    )


class ContentInteraction(Base):
    __tablename__ = "content_interactions"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_hash           = Column(String(64), nullable=False)
    content_id        = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=True)
    interaction_type  = Column(String(32), nullable=False)
    category          = Column(String(64), nullable=True)
    source_domain     = Column(String(128), nullable=True)
    nlp_score_at_time = Column(Float, nullable=True)
    visibility_weight = Column(Float, default=1.0)
    details           = Column(JSONB, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "interaction_type IN ('click','feedback_positive','feedback_negative','filter_used','impression')",
            name="ck_ci_interaction_type",
        ),
        Index("idx_ci_user_created", "user_id", "created_at"),
        Index("idx_ci_content",      "content_id"),
    )


class UserPreferenceProfile(Base):
    __tablename__ = "user_preference_profiles"

    user_id            = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    category_weights   = Column(JSONB, default=dict)
    avg_nlp_tolerance  = Column(Float, default=0.5)
    preferred_sources  = Column(JSONB, default=list)
    declared_interests = Column(JSONB, default=dict)
    interaction_count  = Column(Integer, default=0)
    last_updated       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ContentSimilarityCache(Base):
    __tablename__ = "content_similarity_cache"

    content_id   = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"), primary_key=True)
    similar_ids  = Column(JSONB, nullable=False)
    computed_at  = Column(DateTime(timezone=True), server_default=func.now())
