"""add_claim_entity_graph

Revision ID: a9c8b7d6e5f4
Revises: c1a2t3e4g5o6
Create Date: 2026-07-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a9c8b7d6e5f4"
down_revision: Union[str, Sequence[str], None] = "c1a2t3e4g5o6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "entities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("normalized_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "entity_type IN ('PERSON','ORGANIZATION','LOCATION','EVENT')",
            name="ck_entities_type",
        ),
    )
    op.create_unique_constraint(
        "uq_entities_type_normalized_name", "entities", ["entity_type", "normalized_name"]
    )

    op.create_table(
        "claims",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("article_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("articles.id"), nullable=False),
        sa.Column("verdict", sa.String(20), nullable=False),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "verdict IN ('FAKE','AUTHENTIC','IDDIA','UNKNOWN')",
            name="ck_claims_verdict",
        ),
        sa.CheckConstraint(
            "source_type IN ('TEYIT_ARCHIVE','GEMINI_VERDICT','DEEP_REPORT','TRAINING_CORPUS')",
            name="ck_claims_source_type",
        ),
    )
    op.create_unique_constraint("uq_claims_article_id", "claims", ["article_id"])

    op.create_table(
        "claim_entities",
        sa.Column("claim_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("claims.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_primary_key("pk_claim_entities", "claim_entities", ["claim_id", "entity_id"])
    op.create_index("ix_claim_entities_entity_id", "claim_entities", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_claim_entities_entity_id", table_name="claim_entities")
    op.drop_table("claim_entities")
    op.drop_table("claims")
    op.drop_table("entities")
