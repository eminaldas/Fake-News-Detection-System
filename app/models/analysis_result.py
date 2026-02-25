import uuid
from typing import Any, Optional

from sqlalchemy import Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AnalysisResult(Base):
    """
    Stores the output of the fake-news analysis pipeline for a given article.

    ``linguistic_flags`` is a JSONB column that holds arbitrary key-value pairs
    produced by the linguistic analyser, for example::

        {
            "exclamation_ratio": 0.12,
            "uppercase_ratio": 0.08,
            "avg_sentence_length": 18.4,
            "clickbait_score": 0.65
        }
    """

    __tablename__ = "analysis_results"

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # ── Scores ────────────────────────────────────────────────────────────────
    overall_score: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Composite fake-news probability [0, 1]"
    )
    sentiment_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Sentiment polarity: -1.0 (negative) … +1.0 (positive)",
    )

    # ── Structured linguistic metadata (JSONB) ────────────────────────────────
    linguistic_flags: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB, nullable=True, default=dict
    )

    # ── Foreign key ───────────────────────────────────────────────────────────
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    article: Mapped["Article"] = relationship(  # noqa: F821
        "Article",
        back_populates="analysis_results",
    )

    def __repr__(self) -> str:
        return (
            f"<AnalysisResult article_id={self.article_id} "
            f"overall_score={self.overall_score:.2f}>"
        )
