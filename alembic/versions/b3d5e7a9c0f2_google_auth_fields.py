"""add google_auth fields: google_id, is_email_verified, onboarding_completed

Revision ID: b3d5e7a9c0f2
Revises: a2c4e6f8b0d1
Create Date: 2026-05-07

"""
from alembic import op
import sqlalchemy as sa

revision     = 'b3d5e7a9c0f2'
down_revision = 'a2c4e6f8b0d1'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column('users', sa.Column('google_id',           sa.String(255), nullable=True))
    op.add_column('users', sa.Column('is_email_verified',   sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=False))
    op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])
    # Google ile giriş yapanlar için şifre zorunlu değil
    op.alter_column('users', 'hashed_password', existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'hashed_password', existing_type=sa.String(255), nullable=False)
    op.drop_constraint('uq_users_google_id', 'users', type_='unique')
    op.drop_column('users', 'onboarding_completed')
    op.drop_column('users', 'is_email_verified')
    op.drop_column('users', 'google_id')
