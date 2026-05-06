"""forum_thread image_url column

Revision ID: f9a7b3c2d1e8
Revises: c3f8a2d1e9b4
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa

revision = 'f9a7b3c2d1e8'
down_revision = 'c3f8a2d1e9b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('forum_threads', sa.Column('image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('forum_threads', 'image_url')
