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

from app.models.models import UserRole


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
    email:     str       = Field(..., max_length=255)
    username:  str       = Field(..., min_length=3, max_length=50)
    password:  str       = Field(..., min_length=8)
    interests: List[str] = Field(default_factory=list, description="Seçilen kategori listesi")

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
        """Yalnızca sayısal, bool, None değerlere izin ver — serbest metin yasak."""
        if v is None:
            return v
        clean = {}
        for k, val in v.items():
            if isinstance(val, (int, float, bool)) or val is None:
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
