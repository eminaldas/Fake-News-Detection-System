import uuid
from typing import Optional

from sqlalchemy import Boolean, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Source(Base):
    """
    Represents a news source / domain tracked by the system.

    ``trust_score`` is a manually or algorithmically assigned integer
    between 0 and 100 that reflects how reliable the source is.
    """

    __tablename__ = "sources"

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    domain: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )

    # ── Trust metadata ────────────────────────────────────────────────────────
    trust_score: Mapped[int] = mapped_column(
        # CHECK constraint enforced at DB level
        nullable=False,
        default=50,
    )
    is_official: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Source domain={self.domain!r} trust_score={self.trust_score}>"
