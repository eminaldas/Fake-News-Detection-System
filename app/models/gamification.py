import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.models.models import Base


class XPActionType(str, enum.Enum):
    analysis_created = "analysis_created"
    thread_created   = "thread_created"
    comment_created  = "comment_created"
    vote_cast        = "vote_cast"
    evidence_added   = "evidence_added"
    helpful_received = "helpful_received"
    followed         = "followed"
    daily_login      = "daily_login"


class UserXPEvent(Base):
    __tablename__ = "user_xp_events"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(Enum(XPActionType), nullable=False)
    xp_amount   = Column(Integer, nullable=False)
    ref_id      = Column(String(64), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserBadge(Base):
    __tablename__ = "user_badges"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key      = Column(String(50), nullable=False)
    earned_at      = Column(DateTime(timezone=True), server_default=func.now())
    is_showcased   = Column(Boolean, nullable=False, server_default="false", default=False)
    showcase_order = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "badge_key", name="uq_user_badge"),
    )
