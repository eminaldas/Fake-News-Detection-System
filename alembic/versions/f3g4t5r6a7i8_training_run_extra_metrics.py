"""training_run_extra_metrics

Revision ID: f3g4t5r6a7i8
Revises: e2b3m4a5t6c7
Create Date: 2026-07-28

Retraining kabul kriteri şimdiye kadar yalnızca accuracy'e bakıyordu. Macro-F1 ve
fake recall guard'ları eklendi — tek metrikle yanıltıcı kabul riskini azaltır.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3g4t5r6a7i8"
down_revision: Union[str, Sequence[str], None] = "e2b3m4a5t6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("model_training_runs", sa.Column("macro_f1", sa.Float(), nullable=True))
    op.add_column("model_training_runs", sa.Column("prev_macro_f1", sa.Float(), nullable=True))
    op.add_column("model_training_runs", sa.Column("fake_recall", sa.Float(), nullable=True))
    op.add_column("model_training_runs", sa.Column("prev_fake_recall", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("model_training_runs", "prev_fake_recall")
    op.drop_column("model_training_runs", "fake_recall")
    op.drop_column("model_training_runs", "prev_macro_f1")
    op.drop_column("model_training_runs", "macro_f1")
