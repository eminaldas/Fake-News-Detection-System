"""dm_reply_to

Revision ID: b2c3d4e5f6a7
Revises: a3b5c7d9e1f0
Create Date: 2026-05-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision:      str                             = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a3b5c7d9e1f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE direct_messages
        ADD COLUMN IF NOT EXISTS reply_to_id UUID
            REFERENCES direct_messages(id) ON DELETE SET NULL
    """)


def downgrade() -> None:
    op.drop_column('direct_messages', 'reply_to_id')
