"""admin_panel_fields

Revision ID: b1c2d3e4f5a6
Revises: a3b5c7d9e1f0
Create Date: 2026-05-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a3b5c7d9e1f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'is_shadow_banned', sa.Boolean(), nullable=False, server_default='false'
    ))

    op.add_column('model_feedback', sa.Column(
        'is_ground_truth', sa.Boolean(), nullable=False, server_default='false'
    ))

    op.create_table(
        'system_config',
        sa.Column('key',        sa.String(100),                           primary_key=True),
        sa.Column('value',      postgresql.JSONB(),                       nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True),            nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    )


def downgrade() -> None:
    op.drop_table('system_config')
    op.drop_column('model_feedback', 'is_ground_truth')
    op.drop_column('users', 'is_shadow_banned')
