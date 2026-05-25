"""add_deleted_at_soft_delete

Revision ID: a3b5c7d9e1f0
Revises: f1a2b3c4d5e6
Create Date: 2026-05-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision:      str                             = 'a3b5c7d9e1f0'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.drop_column('users', 'deleted_at')
