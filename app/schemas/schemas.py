"""
app/schemas/schemas.py
=======================
Tüm Pydantic request/response şemaları merkezi olarak burada tanımlanır.
Endpoint dosyalarında şema tanımlanmaz.
"""

import html
import re
from typing import List, Optional
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# Güvenlik
# ─────────────────────────────────────────────────────────────────────────────

class TokenData(BaseModel):
    username: Optional[str] = None


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
