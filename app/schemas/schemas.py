"""
app/schemas/schemas.py
=======================
Tüm Pydantic request/response şemaları merkezi olarak burada tanımlanır.
"""

import html
import re
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator

from app.models.models import User as UserORM, UserRole


# ─────────────────────────────────────────────────────────────────────────────
# Güvenlik / Auth
# ─────────────────────────────────────────────────────────────────────────────

class TokenData(BaseModel):
    user_id:  Optional[str] = None
    username: Optional[str] = None
    role:     Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    expires_in:   int  # saniye cinsinden


class RegisterRequest(BaseModel):
    email:            str            = Field(..., max_length=255)
    username:         str            = Field(..., min_length=3, max_length=50)
    password:         str            = Field(..., min_length=8)
    interests:        List[str]      = Field(default_factory=list, description="Seçilen kategori listesi")
    marketing_source: Optional[str]  = Field(None, max_length=100, description="Bizi nereden duydunuz?")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Geçersiz email formatı")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]{3,50}$", v):
            raise ValueError("Kullanıcı adı yalnızca harf, rakam ve _ içerebilir (3-50 karakter)")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Şifre en az bir rakam içermelidir")
        if not any(c.isalpha() for c in v):
            raise ValueError("Şifre en az bir harf içermelidir")
        return v


class UserResponse(BaseModel):
    id:            UUID
    email:         str
    username:      str
    role:          UserRole
    is_active:     bool
    created_at:    datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    username:         Optional[str] = Field(None, min_length=3, max_length=50)
    current_password: Optional[str] = None
    new_password:     Optional[str] = Field(None, min_length=8)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^[a-zA-Z0-9_]{3,50}$", v):
            raise ValueError("Kullanıcı adı yalnızca harf, rakam ve _ içerebilir")
        return v


# ─────────────────────────────────────────────────────────────────────────────
# Admin
# ─────────────────────────────────────────────────────────────────────────────

class AdminUpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    role:      Optional[UserRole] = None


class PaginatedUserResponse(BaseModel):
    total: int
    page:  int
    size:  int
    items: List[UserResponse]


# ─────────────────────────────────────────────────────────────────────────────
# Analiz Geçmişi
# ─────────────────────────────────────────────────────────────────────────────

class AnalysisRequestResponse(BaseModel):
    id:            UUID
    analysis_type: str
    task_id:       Optional[str] = None
    created_at:    datetime
    title:         Optional[str] = None
    prediction:    Optional[str] = None
    source_url:    Optional[str] = None
    confidence:    Optional[float] = None
    ai_comment:    Optional[dict]  = None

    class Config:
        from_attributes = True


class PaginatedAnalysisRequestResponse(BaseModel):
    total: int
    page:  int
    size:  int
    items: List[AnalysisRequestResponse]


class QuotaResponse(BaseModel):
    used:      int
    limit:     int
    remaining: int
    reset_at:  int   # Unix timestamp (UTC midnight)


# ─────────────────────────────────────────────────────────────────────────────
# Yardımcı
# ─────────────────────────────────────────────────────────────────────────────

def _sanitize(value: str) -> str:
    """HTML tag'lerini ve XSS vektörlerini temizler."""
    value = html.unescape(value)
    value = re.sub(r"<.*?>", "", value)
    return value.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Analiz
# ─────────────────────────────────────────────────────────────────────────────

class ContentAnalysisRequest(BaseModel):
    text: str = Field(..., description="Analiz edilecek haber metni")

    @field_validator("text")
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return _sanitize(v)


class UrlAnalysisRequest(BaseModel):
    url: AnyHttpUrl = Field(..., description="Analiz edilecek haber URL'si (http/https)")

    @field_validator("url", mode="before")
    @classmethod
    def validate_scheme(cls, v) -> str:
        url_str = str(v)
        if not url_str.startswith(("http://", "https://")):
            raise ValueError("URL http veya https şemasıyla başlamalıdır.")
        return url_str


class AnalysisResponse(BaseModel):
    task_id: str
    message: str
    is_direct_match: bool = False
    direct_match_data: Optional[dict] = None


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[dict] = None


class ImageAnalysisResponse(BaseModel):
    task_id:           str
    message:           str
    is_direct_match:   bool = False
    exif_flags:        Optional[dict] = None
    direct_match_data: Optional[dict] = None


# ─────────────────────────────────────────────────────────────────────────────
# Makaleler
# ─────────────────────────────────────────────────────────────────────────────

class ArticleResponse(BaseModel):
    id: UUID
    title: str
    content: str
    status: str
    metadata_info: Optional[dict] = None

    class Config:
        from_attributes = True


class PaginatedArticleResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ArticleResponse]


class TrendingHeadlineResponse(BaseModel):
    id: UUID
    title: str
    status: str
    classification_label: str
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    source_domain: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Haberler (RSS)
# ─────────────────────────────────────────────────────────────────────────────

class NewsArticleResponse(BaseModel):
    id:           UUID
    title:        str
    image_url:    Optional[str]      = None
    source_name:  Optional[str]      = None
    source_url:   Optional[str]      = None
    category:     Optional[str]      = None
    subcategory:  Optional[str]      = None
    pub_date:     Optional[datetime] = None
    source_count: Optional[int]      = None
    trust_score:  Optional[float]    = None
    nlp_score:    Optional[float]    = None
    content_type: Optional[List[str]] = None
    community:    Optional[dict]     = None   # {"view_count": int, "positive_count": int}

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    items: List[NewsArticleResponse]
    total: int
    page:  int


# ─────────────────────────────────────────────────────────────────────────────
# Interactions (Kullanıcı Davranış Takibi)
# ─────────────────────────────────────────────────────────────────────────────

import uuid as _uuid


class InteractionTrackRequest(BaseModel):
    content_id:        Optional[str]   = Field(None, description="NewsArticle UUID")
    interaction_type:  str             = Field(..., description="click|feedback_positive|feedback_negative|filter_used|impression")
    category:          Optional[str]   = None
    source_domain:     Optional[str]   = None
    nlp_score_at_time: Optional[float] = Field(None, ge=0.0, le=1.0)
    visibility_weight: float           = Field(1.0, ge=0.0, le=1.0)
    details:           Optional[dict]  = None

    @field_validator("interaction_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"click", "feedback_positive", "feedback_negative", "filter_used", "impression"}
        if v not in allowed:
            raise ValueError(f"interaction_type must be one of {allowed}")
        return v

    @field_validator("content_id")
    @classmethod
    def validate_uuid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            _uuid.UUID(v)
        except ValueError:
            raise ValueError("content_id must be a valid UUID")
        return v

    @field_validator("details")
    @classmethod
    def sanitize_details(cls, v: Optional[dict]) -> Optional[dict]:
        """Sayısal, bool, None ve kısa string değerlere izin ver (ab_experiment_id UUID için)."""
        if v is None:
            return v
        clean = {}
        for k, val in v.items():
            if isinstance(val, (int, float, bool)) or val is None:
                clean[k] = val
            elif isinstance(val, str) and len(val) <= 64:
                clean[k] = val
        return clean or None


# ── Faz 4: Bildirimler ────────────────────────────────────────────────────────

class NotificationPrefsResponse(BaseModel):
    high_risk_alert: bool
    email_digest:    bool

    model_config = ConfigDict(from_attributes=True)


class NotificationPrefsUpdate(BaseModel):
    high_risk_alert: Optional[bool] = None
    email_digest:    Optional[bool] = None


class NotificationResponse(BaseModel):
    id:         UUID
    title:      str
    body:       Optional[str] = None
    link_url:   Optional[str] = None
    is_read:    bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items:        list[NotificationResponse]
    unread_count: int


# ── Faz 5: Kullanıcı Kontrolü ─────────────────────────────────────────────────

class FeedPreferencesResponse(BaseModel):
    blocked_sources:   list[str]
    hidden_categories: list[str]


class FeedPreferencesUpdate(BaseModel):
    add_blocked_source:     Optional[str] = None
    remove_blocked_source:  Optional[str] = None
    add_hidden_category:    Optional[str] = None
    remove_hidden_category: Optional[str] = None


class DataExportResponse(BaseModel):
    user:               dict
    preference_profile: Optional[dict] = None
    interactions:       list[dict]
    notifications:      list[dict]
    exported_at:        datetime


# ── Faz 6-C: Model Feedback Loop ─────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    task_id:         str = Field(..., description="Article'ın metadata_info.task_id değeri")
    submitted_label: str = Field(..., description="'FAKE' veya 'AUTHENTIC'")

    @field_validator("submitted_label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        if v not in ("FAKE", "AUTHENTIC"):
            raise ValueError("submitted_label 'FAKE' veya 'AUTHENTIC' olmalı")
        return v


class TrainingRunResponse(BaseModel):
    triggered_at:   Optional[datetime] = None
    accuracy:       Optional[float]    = None
    prev_accuracy:  Optional[float]    = None
    status:         Optional[str]      = None
    sample_count:   Optional[int]      = None
    feedback_count: Optional[int]      = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackStatsResponse(BaseModel):
    pending_consensus: int
    consensus_ready:   int
    last_training_run: Optional[TrainingRunResponse] = None


# ── Profile Hub: Kullanıcı İstatistikleri ─────────────────────────────────────

class UserStatsResponse(BaseModel):
    total_analyzed: int
    total_fake: int
    total_authentic: int
    hygiene_score: int
    week_analyzed: int
    week_fake: int

    model_config = ConfigDict(from_attributes=True)


# ── Profile Hub: Güvenlik ─────────────────────────────────────────────────────

class SessionItem(BaseModel):
    ip_hash: str
    created_at: datetime
    is_current: bool
    label: str

    model_config = ConfigDict(from_attributes=True)

class SessionListResponse(BaseModel):
    sessions: List[SessionItem]
    anomaly_detected: bool


# ── Profile Hub: Geri Bildirimlerim ──────────────────────────────────────────

class FeedbackHistoryItem(BaseModel):
    article_title:   str
    submitted_label: str
    model_status:    Optional[str]
    accepted:        bool
    created_at:      datetime


class FeedbackHistoryResponse(BaseModel):
    items:          List[FeedbackHistoryItem]
    total_sent:     int
    total_accepted: int


# ── Profile Hub: AI Lab ───────────────────────────────────────────────────────

class SourceSearchItem(BaseModel):
    id:                str
    name:              str
    url:               str
    credibility_score: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Forum
# ─────────────────────────────────────────────────────────────────────────────

FORUM_CATEGORIES = [
    "haberler",
    "teknoloji",
    "kültür",
    "spor",
    "eğlence",
    "bilim",
    "ekonomi",
    "genel",
]


class TagItem(BaseModel):
    id:          UUID
    name:        str
    is_system:   bool
    usage_count: int

    model_config = ConfigDict(from_attributes=True)


class ForumArticleSummary(BaseModel):
    id:         UUID
    title:      str
    ai_verdict: Optional[str] = None
    confidence: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ForumCommentCreate(BaseModel):
    body:          str       = Field(..., min_length=1, max_length=5000)
    parent_id:     Optional[UUID] = None
    evidence_urls: List[str] = Field(default_factory=list, max_length=10)

    @field_validator("evidence_urls", mode="before")
    @classmethod
    def sanitize_urls(cls, v):
        return [html.escape(u)[:512] for u in (v or [])]


# ── Forum Trust ───────────────────────────────────────────────────────────────

TIER_META = {
    "yeni_uye":    {"label": "Yeni Üye",    "stars": 1},
    "dogrulayici": {"label": "Doğrulayıcı", "stars": 2},
    "analist":     {"label": "Analist",     "stars": 3},
    "dedektif":    {"label": "Dedektif",    "stars": 4},
}

CATEGORY_LABELS = {
    "haberler":   "Haberler",
    "teknoloji":  "Teknoloji",
    "kültür":     "Kültür",
    "spor":       "Spor",
    "eğlence":    "Eğlence",
    "bilim":      "Bilim",
    "ekonomi":    "Ekonomi",
    "genel":      "Genel",
}


class ForumTrustInfo(BaseModel):
    score:         float
    tier:          str
    tier_label:    str
    stars:         int
    category:      Optional[str] = None
    display_label: str

    @classmethod
    def from_user(cls, user: UserORM) -> "ForumTrustInfo":
        meta   = TIER_META.get(user.forum_trust_tier, TIER_META["yeni_uye"])
        cat_tr = CATEGORY_LABELS.get(user.forum_trust_category or "", "")
        if cat_tr and user.forum_trust_tier in {"analist", "dedektif"}:
            display = f"{cat_tr} {meta['label']}"
        else:
            display = meta["label"]
        return cls(
            score=round(user.forum_trust_score, 1),
            tier=user.forum_trust_tier,
            tier_label=meta["label"],
            stars=meta["stars"],
            category=user.forum_trust_category,
            display_label=display,
        )


class ForumCommentItem(BaseModel):
    id:             UUID
    thread_id:      UUID
    parent_id:      Optional[UUID] = None
    username:       str
    body:           str
    evidence_urls:  List[str]      = Field(default_factory=list)
    helpful_count:  int
    depth:          int            = 0
    is_highlighted: bool
    created_at:     datetime
    tier:           Optional[str]  = None
    display_label:  Optional[str]  = None
    stars:             Optional[int]  = None
    moderation_status: str            = "clean"
    replies:           List["ForumCommentItem"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


ForumCommentItem.model_rebuild()


class ForumThreadCreate(BaseModel):
    title:      str            = Field(..., min_length=3, max_length=300)
    body:       str            = Field(..., min_length=10, max_length=10000)
    category:   Optional[str]  = None
    article_id: Optional[UUID] = None
    tag_names:  List[str]      = Field(default_factory=list, max_length=10)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v and v not in FORUM_CATEGORIES:
            raise ValueError(f"Geçersiz kategori. Seçenekler: {', '.join(FORUM_CATEGORIES)}")
        return v

    @field_validator("tag_names", mode="before")
    @classmethod
    def normalize_tags(cls, v):
        tags = []
        for t in (v or []):
            t = t.strip()
            if not t.startswith("#"):
                t = "#" + t
            tags.append(t[:100].lower())
        return list(dict.fromkeys(tags))  # deduplicate, preserve order


class ForumThreadAuthor(BaseModel):
    id:       UUID
    username: str

    model_config = ConfigDict(from_attributes=True)


class ForumThreadSummary(BaseModel):
    id:               UUID
    title:            str
    category:         Optional[str]
    status:           str
    vote_suspicious:  int
    vote_authentic:   int
    vote_investigate: int
    comment_count:    int
    created_at:       datetime
    author:           ForumThreadAuthor
    tags:             List[TagItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ForumThreadDetail(ForumThreadSummary):
    body:              str
    article:           Optional[ForumArticleSummary] = None
    comments:          List[ForumCommentItem]        = Field(default_factory=list)
    current_user_vote: Optional[str]                 = None


class ForumThreadUpdate(BaseModel):
    title:     Optional[str]       = Field(None, min_length=5, max_length=300)
    body:      Optional[str]       = Field(None, max_length=10000)
    category:  Optional[str]       = None
    tag_names: Optional[List[str]] = None


class ForumCommentUpdate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


class ForumVoteCreate(BaseModel):
    vote_type: str = Field(..., pattern="^(suspicious|authentic|investigate|up|down)$")


class ForumVoteResult(BaseModel):
    vote_suspicious:   int
    vote_authentic:    int
    vote_investigate:  int
    vote_up:           int = 0
    vote_down:         int = 0
    status:            str
    current_user_vote: Optional[str] = None


class ForumTagSearchResponse(BaseModel):
    tags: List[TagItem]


class ForumTrendingThread(BaseModel):
    id:            UUID
    title:         str
    category:      Optional[str]
    comment_count: int
    total_votes:   int
    created_at:    datetime

    model_config = ConfigDict(from_attributes=True)


class ForumTrendingResponse(BaseModel):
    trending_threads: List[ForumTrendingThread]
    trending_tags:    List[TagItem]


class ForumThreadListResponse(BaseModel):
    items: List[ForumThreadSummary]
    total: int
    page:  int
    size:  int


class ForumReportCreate(BaseModel):
    reason: str = Field(..., pattern="^(spam|hate_speech|misinformation|off_topic)$")


class ModerationQueueItem(BaseModel):
    id:               UUID
    body:             str
    author:           str
    thread_title:     str
    thread_id:        UUID
    flag_type:        str
    moderation_note:  Optional[str] = None
    report_count:     int
    created_at:       datetime

    model_config = ConfigDict(from_attributes=True)


class ModerationQueueResponse(BaseModel):
    items: List[ModerationQueueItem]
    total: int
    page:  int
    size:  int


# ─────────────────────────────────────────────────────────────────────────────
# Browser Extension
# ─────────────────────────────────────────────────────────────────────────────

class SignalsRequest(BaseModel):
    text: str = Field(..., max_length=500)

class SignalsResponse(BaseModel):
    clickbait_score:   float
    caps_ratio:        float
    exclamation_ratio: float
    hedge_ratio:       float
    source_score:      float
    risk_score:        float
    label:             str   # "clean" | "suspicious"


class SharedAnalysisResponse(BaseModel):
    article_id:      str
    title:           str
    prediction:      str
    confidence:      float
    risk_score:      Optional[float] = None
    clickbait_score: Optional[float] = None
    created_at:      Optional[str]   = None


# ── Forum Bildirimleri (Notification modeli — read_at) ────────────────────────

class ForumNotificationItem(BaseModel):
    id:         UUID
    type:       str
    payload:    dict
    read_at:    Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ForumNotificationListResponse(BaseModel):
    items:  List[ForumNotificationItem]
    unread: int


# ── Sosyal / Takip ────────────────────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    id:              UUID
    username:        str
    bio:             Optional[str] = None
    follower_count:  int
    following_count: int
    is_following:    bool = False
    thread_count:    int = 0
    created_at:      datetime
    model_config = ConfigDict(from_attributes=True)


class MentionSearchItem(BaseModel):
    id:       UUID
    username: str
    model_config = ConfigDict(from_attributes=True)


class ForumSearchResponse(BaseModel):
    items: List[ForumThreadSummary]
    total: int
    query: str


class ForumThreadReportCreate(BaseModel):
    reason: str = Field(..., pattern="^(spam|misinformation|hate_speech|off_topic)$")
