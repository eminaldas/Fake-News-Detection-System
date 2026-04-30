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

    bio             = Column(Text, nullable=True)
    avatar_url      = Column(String(500), nullable=True)
    follower_count  = Column(Integer, default=0, nullable=False)
    following_count = Column(Integer, default=0, nullable=False)

    forum_trust_score    = Column(Float, nullable=False, server_default="0.0")
    forum_trust_tier     = Column(String(20), nullable=False, server_default="yeni_uye")
    forum_trust_category = Column(String(50), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "forum_trust_tier IN ('yeni_uye','dogrulayici','analist','dedektif')",
            name="ck_users_forum_trust_tier",
        ),
        CheckConstraint(
            "forum_trust_score >= 0",
            name="ck_users_forum_trust_score_nonneg",
        ),
    )

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


class SourceBias(Base):
    __tablename__ = "source_bias"

    domain             = Column(String(255), primary_key=True)
    display_name       = Column(String(255), nullable=True)
    political_lean     = Column(Float, nullable=True)      # -1.0 sol → +1.0 sağ/yandaş
    government_aligned = Column(Boolean, nullable=False, server_default="false")
    owner_entity       = Column(String(255), nullable=True)
    media_group        = Column(String(255), nullable=True)
    clickbait_tendency = Column(Float, nullable=False, server_default="0.0")
    factual_accuracy   = Column(Float, nullable=False, server_default="0.5")
    notable_incidents  = Column(JSONB, nullable=True)
    topic_notes        = Column(JSONB, nullable=True)
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("political_lean >= -1.0 AND political_lean <= 1.0", name="ck_source_bias_political_lean"),
        CheckConstraint("clickbait_tendency >= 0.0 AND clickbait_tendency <= 1.0", name="ck_source_bias_clickbait"),
        CheckConstraint("factual_accuracy >= 0.0 AND factual_accuracy <= 1.0", name="ck_source_bias_factual"),
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False, unique=True)
    status     = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)
    signals    = Column(JSONB, nullable=True)
    ai_comment = Column(JSONB, nullable=True)
    full_report = Column(JSONB, nullable=True)
    source_bias_summary = Column(JSONB, nullable=True)
    temporal_analysis   = Column(JSONB, nullable=True)
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
    blocked_sources    = Column(JSONB, default=list)
    hidden_categories  = Column(JSONB, default=list)
    last_updated       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ContentSimilarityCache(Base):
    __tablename__ = "content_similarity_cache"

    content_id   = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"), primary_key=True)
    similar_ids  = Column(JSONB, nullable=False)
    computed_at  = Column(DateTime(timezone=True), server_default=func.now())


class UserNotificationPrefs(Base):
    __tablename__ = "user_notification_prefs"

    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    high_risk_alert = Column(Boolean, nullable=False, default=True)
    email_digest    = Column(Boolean, nullable=False, default=False)
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserNotification(Base):
    __tablename__ = "user_notifications"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title      = Column(String(255), nullable=False)
    body       = Column(Text, nullable=True)
    link_url   = Column(Text, nullable=True)
    is_read    = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_un_user_created", "user_id", "created_at"),
    )


class ModelFeedback(Base):
    __tablename__ = "model_feedback"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id      = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_label = Column(String(20), nullable=False)   # 'FAKE' | 'AUTHENTIC'
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("article_id", "user_id", name="uq_model_feedback_article_user"),
        CheckConstraint(
            "submitted_label IN ('FAKE', 'AUTHENTIC')",
            name="ck_model_feedback_label",
        ),
    )


class ModelTrainingRun(Base):
    __tablename__ = "model_training_runs"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    triggered_at   = Column(DateTime(timezone=True), server_default=func.now())
    sample_count   = Column(Integer, nullable=True)
    feedback_count = Column(Integer, nullable=True)
    accuracy       = Column(Float, nullable=True)
    prev_accuracy  = Column(Float, nullable=True)
    status         = Column(String(20), nullable=False)   # 'success' | 'skipped' | 'failed'
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('success', 'skipped', 'failed')",
            name="ck_model_training_run_status",
        ),
    )


class AbExperiment(Base):
    __tablename__ = "ab_experiments"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(100), nullable=False, unique=True)
    status         = Column(String(20), nullable=False, server_default="active")
    min_clicks     = Column(Integer, nullable=False, default=100)
    winner_variant = Column(Integer, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    concluded_at   = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'paused', 'concluded')",
            name="ck_ab_experiment_status",
        ),
        CheckConstraint(
            "winner_variant IN (0, 1, 2) OR winner_variant IS NULL",
            name="ck_ab_experiment_winner",
        ),
    )


class AbVariantAssignment(Base):
    __tablename__ = "ab_variant_assignments"

    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("ab_experiments.id", ondelete="CASCADE"), primary_key=True)
    variant       = Column(Integer, nullable=False)
    assigned_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "variant IN (0, 1, 2)",
            name="ck_ab_assignment_variant",
        ),
    )


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id      = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title           = Column(String(300), nullable=False)
    body            = Column(Text, nullable=False)
    category        = Column(String(50), nullable=True)
    status          = Column(String(20), nullable=False, server_default="active")
    vote_suspicious = Column(Integer, nullable=False, server_default="0")
    vote_authentic  = Column(Integer, nullable=False, server_default="0")
    vote_investigate = Column(Integer, nullable=False, server_default="0")
    comment_count   = Column(Integer, nullable=False, server_default="0")
    vote_up              = Column(Integer, server_default="0", nullable=False)
    vote_down            = Column(Integer, server_default="0", nullable=False)
    view_count           = Column(Integer, server_default="0", nullable=False)
    fact_check_triggered = Column(Boolean, server_default="false", nullable=False)
    group_id             = Column(UUID(as_uuid=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    user     = relationship("User")
    article  = relationship("Article")
    comments = relationship("ForumComment", back_populates="thread", cascade="all, delete-orphan")
    votes    = relationship("ForumVote", back_populates="thread", cascade="all, delete-orphan")
    tags     = relationship("Tag", secondary="thread_tags", back_populates="threads")

    __table_args__ = (
        CheckConstraint("status IN ('active','under_review','resolved')", name="ck_forum_thread_status"),
        Index("idx_forum_thread_category_created", "category", "created_at"),
    )


class ForumComment(Base):
    __tablename__ = "forum_comments"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id     = Column(UUID(as_uuid=True), ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id     = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"), nullable=True)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body          = Column(Text, nullable=False)
    evidence_urls = Column(JSONB, nullable=False, server_default="[]")
    helpful_count = Column(Integer, nullable=False, server_default="0")
    depth         = Column(Integer, nullable=False, server_default="0")
    is_highlighted    = Column(Boolean, nullable=False, server_default="false")
    moderation_status = Column(String(20), nullable=False, server_default="clean")
    moderation_note   = Column(Text, nullable=True)
    is_edited  = Column(Boolean, default=False, nullable=False)
    edited_at  = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    thread  = relationship("ForumThread", back_populates="comments")
    user    = relationship("User")
    replies = relationship("ForumComment", back_populates="parent")
    parent  = relationship("ForumComment", back_populates="replies", remote_side="ForumComment.id")

    __table_args__ = (
        CheckConstraint("depth >= 0 AND depth <= 3", name="ck_forum_comment_depth"),
        CheckConstraint(
            "moderation_status IN ('clean','flagged_ai','flagged_user','removed')",
            name="ck_forum_comment_moderation_status",
        ),
        Index("idx_forum_comment_thread", "thread_id", "created_at"),
    )


class ForumVote(Base):
    __tablename__ = "forum_votes"

    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False)
    user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vote_type = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    thread = relationship("ForumThread", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_forum_vote_thread_user"),
        CheckConstraint("vote_type IN ('suspicious','authentic','investigate')", name="ck_forum_vote_type"),
    )


class ForumCommentVote(Base):
    __tablename__ = "forum_comment_votes"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_forum_comment_vote_user"),
    )


class ForumReport(Base):
    __tablename__ = "forum_reports"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id  = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"), nullable=False)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason      = Column(String(20), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("comment_id", "reporter_id", name="uq_forum_report_comment_reporter"),
        CheckConstraint(
            "reason IN ('spam','hate_speech','misinformation','off_topic')",
            name="ck_forum_report_reason",
        ),
        Index("idx_forum_report_comment", "comment_id"),
    )


class Tag(Base):
    __tablename__ = "tags"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100), unique=True, nullable=False)
    is_system   = Column(Boolean, nullable=False, server_default="false")
    category    = Column(String(50), nullable=True)
    usage_count = Column(Integer, nullable=False, server_default="0")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    threads = relationship("ForumThread", secondary="thread_tags", back_populates="tags")


class ThreadTag(Base):
    __tablename__ = "thread_tags"

    thread_id = Column(UUID(as_uuid=True), ForeignKey("forum_threads.id", ondelete="CASCADE"), primary_key=True)
    tag_id    = Column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class UserFollow(Base):
    __tablename__ = "user_follows"

    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    followed_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    follower = relationship("User", foreign_keys=[follower_id], backref="following_rels")
    followed = relationship("User", foreign_keys=[followed_id], backref="follower_rels")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("forum_threads.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type       = Column(String(50), nullable=False)
    payload    = Column(JSONB, nullable=False, server_default="{}")
    read_at    = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="notifications")
