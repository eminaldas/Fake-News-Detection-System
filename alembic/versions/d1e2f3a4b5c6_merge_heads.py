"""merge heads: c1d2e3f4a5b6 + b2c3d4e5f6a7

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6, b2c3d4e5f6a7
Create Date: 2026-05-30
"""
from typing import Sequence, Union

revision:      str                             = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = ('c1d2e3f4a5b6', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
