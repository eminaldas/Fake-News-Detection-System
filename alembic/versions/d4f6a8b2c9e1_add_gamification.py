"""add_gamification

Revision ID: d4f6a8b2c9e1
Revises: b3d5e7a9c0f2
Create Date: 2026-05-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd4f6a8b2c9e1'
down_revision: Union[str, Sequence[str], None] = 'b3d5e7a9c0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) User tablosuna yeni sütunlar
    op.add_column('users', sa.Column('total_xp',        sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('level',           sa.Integer(), nullable=False, server_default='1'))
    op.add_column('users', sa.Column('current_streak',  sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_login_date', sa.Date(),    nullable=True))

    # 2) xpactiontype enum + user_xp_events tablosu (ham SQL — SQLAlchemy'nin auto-create sorununu atlar)
    op.execute("""
        CREATE TYPE xpactiontype AS ENUM (
            'analysis_created', 'thread_created', 'comment_created', 'vote_cast',
            'evidence_added', 'helpful_received', 'followed', 'daily_login'
        )
    """)
    op.execute("""
        CREATE TABLE user_xp_events (
            id          SERIAL PRIMARY KEY,
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_type xpactiontype NOT NULL,
            xp_amount   INTEGER NOT NULL,
            ref_id      VARCHAR(64),
            created_at  TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.create_index('ix_user_xp_events_user_id',    'user_xp_events', ['user_id'],    unique=False)
    op.create_index('ix_user_xp_events_created_at', 'user_xp_events', ['created_at'], unique=False)

    # 4) user_badges tablosu
    op.create_table(
        'user_badges',
        sa.Column('id',             sa.Integer(),                  nullable=False),
        sa.Column('user_id',        postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('badge_key',      sa.String(50),                 nullable=False),
        sa.Column('earned_at',      sa.DateTime(timezone=True),    server_default=sa.text('now()'), nullable=True),
        sa.Column('is_showcased',   sa.Boolean(),                  nullable=False, server_default='false'),
        sa.Column('showcase_order', sa.Integer(),                  nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'badge_key', name='uq_user_badge'),
    )
    op.create_index('ix_user_badges_user_id', 'user_badges', ['user_id'], unique=False)

    # 5) Mevcut kullanıcılara level_1 rozeti ver
    op.execute("""
        INSERT INTO user_badges (user_id, badge_key, earned_at, is_showcased)
        SELECT id, 'level_1', NOW(), false FROM users
        ON CONFLICT (user_id, badge_key) DO NOTHING
    """)

    # 6) İlk 100 kullanıcıya early_bird rozeti ver
    op.execute("""
        INSERT INTO user_badges (user_id, badge_key, earned_at, is_showcased)
        SELECT id, 'early_bird', NOW(), false
        FROM (SELECT id FROM users ORDER BY created_at LIMIT 100) early
        ON CONFLICT (user_id, badge_key) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_index('ix_user_badges_user_id',     table_name='user_badges')
    op.drop_table('user_badges')
    op.drop_index('ix_user_xp_events_created_at', table_name='user_xp_events')
    op.drop_index('ix_user_xp_events_user_id',    table_name='user_xp_events')
    op.drop_table('user_xp_events')
    op.drop_column('users', 'last_login_date')
    op.drop_column('users', 'current_streak')
    op.drop_column('users', 'level')
    op.drop_column('users', 'total_xp')
    op.execute("DROP TYPE IF EXISTS xpactiontype")
