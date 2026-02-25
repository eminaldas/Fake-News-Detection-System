import uuid
from datetime import datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.models.base import Base


class Article(Base):
    """
    Represents a news article captured by the scraping pipeline.

    The ``embedding`` column stores a 768-dimensional sentence embedding
    produced by the ML engine, enabling pgvector similarity searches.
    """

    __tablename__ = "articles"
    __table_args__ = (
        UniqueConstraint("source_url", name="uq_articles_source_url"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # ── Content ──────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # ── ML vector embedding ───────────────────────────────────────────────────
    # pgvector type: vector(768) – must match EMBEDDING_DIM in settings
    embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(settings.EMBEDDING_DIM), nullable=True
    )

    # ── Foreign key to Source ─────────────────────────────────────────────────
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(  # noqa: F821
        "AnalysisResult",
        back_populates="article",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Article id={self.id} title={self.title[:40]!r}>"
