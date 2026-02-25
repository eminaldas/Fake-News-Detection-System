import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


# ── Write schemas (API input) ───────────────────────────────────────────────
class ArticleCreate(BaseModel):
    title: str = Field(..., max_length=512)
    content: str
    source_url: HttpUrl
    published_at: Optional[datetime] = None
    source_id: Optional[uuid.UUID] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=512)
    content: Optional[str] = None
    published_at: Optional[datetime] = None


# ── Read schema (API output) ────────────────────────────────────────────────
class ArticleRead(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    source_url: str
    published_at: Optional[datetime]
    scraped_at: datetime
    source_id: Optional[uuid.UUID]
    # Embedding is excluded from API responses (large payload)

    model_config = {"from_attributes": True}
