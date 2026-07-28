"""analysis_matches_table

Revision ID: e2b3m4a5t6c7
Revises: d1a2p3o4l5c6
Create Date: 2026-07-28

Stage 1 (pgvector) benzerlik oylamasına katılan en fazla 3 eşleşmenin tamamını
saklayan ara tablo. Önceden yalnızca en iyi eşleşme (evidence) saklanıyordu;
oylamanın nasıl oluştuğu sonradan yeniden kurulamıyordu.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e2b3m4a5t6c7"
down_revision: Union[str, Sequence[str], None] = "d1a2p3o4l5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analysis_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("analysis_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("article_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("articles.id"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("similarity", sa.Float(), nullable=False),
        sa.Column("cosine_distance", sa.Float(), nullable=False),
        sa.Column("normalized_label", sa.String(length=20), nullable=False),
        sa.Column("vote_weight", sa.Float(), nullable=False),
        sa.Column("is_winner", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("request_id", "rank", name="uq_analysis_matches_request_rank"),
    )
    op.create_index("ix_analysis_matches_request_id", "analysis_matches", ["request_id"])


def downgrade() -> None:
    op.drop_index("ix_analysis_matches_request_id", table_name="analysis_matches")
    op.drop_table("analysis_matches")
