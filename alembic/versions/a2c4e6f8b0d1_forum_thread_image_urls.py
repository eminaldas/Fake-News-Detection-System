"""forum_thread image_url -> image_urls jsonb

Revision ID: a2c4e6f8b0d1
Revises: f9a7b3c2d1e8
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'a2c4e6f8b0d1'
down_revision = 'f9a7b3c2d1e8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('forum_threads', sa.Column('image_urls', JSONB(), nullable=False, server_default='[]'))
    # Mevcut image_url değerlerini image_urls'e taşı
    op.execute("""
        UPDATE forum_threads
        SET image_urls = json_build_array(image_url)::jsonb
        WHERE image_url IS NOT NULL AND image_url != ''
    """)
    op.drop_column('forum_threads', 'image_url')


def downgrade() -> None:
    op.add_column('forum_threads', sa.Column('image_url', sa.Text(), nullable=True))
    op.execute("""
        UPDATE forum_threads
        SET image_url = image_urls->>0
        WHERE jsonb_array_length(image_urls) > 0
    """)
    op.drop_column('forum_threads', 'image_urls')
