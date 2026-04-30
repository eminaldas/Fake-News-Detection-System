"""source_bias table and temporal analysis columns

Revision ID: c3f8a2d1e9b4
Revises: a1b2c3d4e5f6
Create Date: 2026-04-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "c3f8a2d1e9b4"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_bias",
        sa.Column("domain", sa.String(255), primary_key=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("political_lean", sa.Float, nullable=True),
        sa.Column("government_aligned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("owner_entity", sa.String(255), nullable=True),
        sa.Column("media_group", sa.String(255), nullable=True),
        sa.Column("clickbait_tendency", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("factual_accuracy", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("notable_incidents", JSONB, nullable=True),
        sa.Column("topic_notes", JSONB, nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.add_column(
        "analysis_results",
        sa.Column("source_bias_summary", JSONB, nullable=True),
    )
    op.add_column(
        "analysis_results",
        sa.Column("temporal_analysis", JSONB, nullable=True),
    )
    op.create_check_constraint(
        "ck_source_bias_political_lean",
        "source_bias",
        "political_lean >= -1.0 AND political_lean <= 1.0",
    )
    op.create_check_constraint(
        "ck_source_bias_clickbait",
        "source_bias",
        "clickbait_tendency >= 0.0 AND clickbait_tendency <= 1.0",
    )
    op.create_check_constraint(
        "ck_source_bias_factual",
        "source_bias",
        "factual_accuracy >= 0.0 AND factual_accuracy <= 1.0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_source_bias_factual", "source_bias")
    op.drop_constraint("ck_source_bias_clickbait", "source_bias")
    op.drop_constraint("ck_source_bias_political_lean", "source_bias")
    op.drop_column("analysis_results", "temporal_analysis")
    op.drop_column("analysis_results", "source_bias_summary")
    op.drop_table("source_bias")
