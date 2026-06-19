"""category taxonomy

Revision ID: c1a2t3e4g5o6
Revises: d1e2f3a4b5c6
Create Date: 2026-06-17

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "c1a2t3e4g5o6"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# SLUG_MAP'ten türetilen başlangıç taksonomisi (ana -> [alt, ...])
SEED = {
    "gündem":    ["türkiye", "dünya", "siyaset", "son dakika", "analiz", "yerel"],
    "ekonomi":   ["finans", "borsa", "piyasa"],
    "spor":      ["futbol", "basketbol"],
    "sağlık":    ["beslenme", "bilim"],
    "teknoloji": ["bilim", "oyun", "otomobil", "yazılım"],
    "kültür":    ["sanat", "sinema", "tiyatro", "müzik", "kitap"],
    "yaşam":     ["magazin", "seyahat", "aile", "yemek", "eğitim"],
}


def _slug(s: str) -> str:
    # Slug, news_articles.category/subcategory ile birebir eşleşmeli (RSS ingester
    # SLUG_MAP'i Türkçe değer yazıyor: "sağlık", "son dakika"...). ASCII'ye çevirmek
    # eşleşmeyi bozar; ham (küçük harf Türkçe) değeri kullanıyoruz.
    return s.lower()


def upgrade() -> None:
    op.add_column("news_articles", sa.Column("category_confidence", sa.Float(), nullable=True))

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=True),
        sa.Column("prototype_text", sa.Text(), nullable=True),
        sa.Column("prototype_embedding", Vector(768), nullable=True),
        sa.Column("is_stale", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_categories_parent_slug", "categories", ["parent_id", "slug"])
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])

    # Seed
    conn = op.get_bind()
    order = 0
    for main, subs in SEED.items():
        main_id = uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO categories (id, slug, name, parent_id, display_order, is_active) "
                "VALUES (:id, :slug, :name, NULL, :ord, true)"
            ),
            {"id": main_id, "slug": _slug(main), "name": main.capitalize(), "ord": order},
        )
        order += 1
        for sub in subs:
            conn.execute(
                sa.text(
                    "INSERT INTO categories (id, slug, name, parent_id, display_order, is_active) "
                    "VALUES (:id, :slug, :name, :pid, :ord, true)"
                ),
                {"id": uuid.uuid4(), "slug": _slug(sub), "name": sub.capitalize(),
                 "pid": main_id, "ord": order},
            )
            order += 1

    op.add_column(
        "user_preference_profiles",
        sa.Column("hidden_subcategories", postgresql.JSONB(),
                  nullable=False, server_default=sa.text("'[]'::jsonb")),
    )


def downgrade() -> None:
    op.drop_column("user_preference_profiles", "hidden_subcategories")
    op.drop_index("ix_categories_parent_id", table_name="categories")
    op.drop_constraint("uq_categories_parent_slug", "categories", type_="unique")
    op.drop_table("categories")
    op.drop_column("news_articles", "category_confidence")
