"""add_user_reports

Revision ID: e1f2a3b4c5d6
Revises: d4f6a8b2c9e1
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision:       str                             = 'e1f2a3b4c5d6'
down_revision:  Union[str, Sequence[str], None] = 'd4f6a8b2c9e1'
branch_labels:  Union[str, Sequence[str], None] = None
depends_on:     Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE reporttype AS ENUM ('fake_news', 'bug', 'complaint', 'other')
    """)
    op.execute("""
        CREATE TYPE reportstatus AS ENUM ('open', 'in_review', 'resolved')
    """)
    op.execute("""
        CREATE TABLE user_reports (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type        reporttype   NOT NULL,
            subject     VARCHAR(200) NOT NULL,
            description TEXT         NOT NULL,
            url_or_ref  VARCHAR(500),
            status      reportstatus NOT NULL DEFAULT 'open',
            admin_reply TEXT,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
            replied_at  TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX ix_user_reports_reporter_id ON user_reports (reporter_id)")
    op.execute("CREATE INDEX ix_user_reports_status      ON user_reports (status)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_reports")
    op.execute("DROP TYPE IF EXISTS reportstatus")
    op.execute("DROP TYPE IF EXISTS reporttype")
