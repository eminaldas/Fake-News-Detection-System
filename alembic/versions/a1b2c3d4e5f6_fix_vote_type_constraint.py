"""fix_vote_type_constraint

Revision ID: a1b2c3d4e5f6
Revises: befee980e00e
Create Date: 2026-04-21 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'befee980e00e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_forum_vote_type', 'forum_votes', type_='check')
    op.create_check_constraint(
        'ck_forum_vote_type',
        'forum_votes',
        "vote_type IN ('suspicious','authentic','investigate','up','down')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_forum_vote_type', 'forum_votes', type_='check')
    op.create_check_constraint(
        'ck_forum_vote_type',
        'forum_votes',
        "vote_type IN ('suspicious','authentic','investigate')",
    )
