"""roles_restrictions_warnings

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-05-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL enum'a yeni değer ekleme transaction dışında yapılmalı
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'superadmin'"))
    conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'moderator'"))
    conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'analyst'"))

    # Kullanıcı kısıtlama sütunları
    op.add_column('users', sa.Column('can_comment',       sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('can_post_analysis', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('can_create_thread', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('restriction_reason', sa.Text(),   nullable=True))

    # Uyarı / ceza geçmişi tablosu
    op.create_table(
        'user_warnings',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id',      postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'),  nullable=False),
        sa.Column('admin_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action',       sa.String(30), nullable=False),
        sa.Column('reason',       sa.Text(),     nullable=False),
        sa.Column('restrictions', postgresql.JSONB(), nullable=True),
        sa.Column('created_at',   sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint("action IN ('warn','restrict','shadow_ban','ban')", name='ck_user_warnings_action'),
    )
    op.create_index('ix_user_warnings_user_id', 'user_warnings', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_warnings_user_id', table_name='user_warnings')
    op.drop_table('user_warnings')
    op.drop_column('users', 'restriction_reason')
    op.drop_column('users', 'can_create_thread')
    op.drop_column('users', 'can_post_analysis')
    op.drop_column('users', 'can_comment')
    # Enum değerleri PostgreSQL'de geri alınamaz, downgrade sadece sütunları kaldırır
