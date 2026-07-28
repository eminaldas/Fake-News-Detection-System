"""decision_policy_provenance

Revision ID: d1a2p3o4l5c6
Revises: a9c8b7d6e5f4
Create Date: 2026-07-28

analysis_results'a karar sürecinin izlenebilirliği için alanlar eklenir
(model_probability, risk_score, combined_score, model_version, policy_version,
decision_path). analysis_requests'e sonuca işaret eden nullable bir result_id
FK'ı eklenir — işlem sürerken NULL, tamamlanınca ilgili analysis_results
kaydına bağlanır.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d1a2p3o4l5c6"
down_revision: Union[str, Sequence[str], None] = "a9c8b7d6e5f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("analysis_results", sa.Column("model_probability", sa.Float(), nullable=True))
    op.add_column("analysis_results", sa.Column("risk_score", sa.Float(), nullable=True))
    op.add_column("analysis_results", sa.Column("combined_score", sa.Float(), nullable=True))
    op.add_column("analysis_results", sa.Column("model_version", sa.String(length=100), nullable=True))
    op.add_column("analysis_results", sa.Column("policy_version", sa.String(length=50), nullable=True))
    op.add_column("analysis_results", sa.Column("decision_path", sa.String(length=50), nullable=True))

    op.add_column(
        "analysis_requests",
        sa.Column("result_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_analysis_requests_result_id",
        "analysis_requests", "analysis_results",
        ["result_id"], ["id"],
    )
    op.create_index(
        "ix_analysis_requests_result_id", "analysis_requests", ["result_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_analysis_requests_result_id", table_name="analysis_requests")
    op.drop_constraint("fk_analysis_requests_result_id", "analysis_requests", type_="foreignkey")
    op.drop_column("analysis_requests", "result_id")

    op.drop_column("analysis_results", "decision_path")
    op.drop_column("analysis_results", "policy_version")
    op.drop_column("analysis_results", "model_version")
    op.drop_column("analysis_results", "combined_score")
    op.drop_column("analysis_results", "risk_score")
    op.drop_column("analysis_results", "model_probability")
