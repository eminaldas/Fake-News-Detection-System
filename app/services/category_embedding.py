"""
app/services/category_embedding.py
==================================
Kategori prototip metninden embedding üretir ve DB'ye yazar.
Vectorizer yüklenemezse metin korunur, is_stale=True bırakılır.
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Category
from app.services.category_classifier import CategoryProto

logger = logging.getLogger(__name__)

_vectorizer = None


def _get_vectorizer():
    global _vectorizer
    if _vectorizer is None:
        from ml_engine.vectorizer import TurkishVectorizer
        _vectorizer = TurkishVectorizer()
    return _vectorizer


def compute_prototype_embedding(text: str) -> Optional[list[float]]:
    """Metinden embedding döndürür. Başarısızsa None."""
    if not text or not text.strip():
        return None
    try:
        emb = _get_vectorizer().get_embedding(text)
        if emb and any(v != 0.0 for v in emb):
            return list(emb)
    except Exception as exc:
        logger.warning("category.prototype_embed_failed err=%s", exc)
    return None


async def refresh_stale_prototypes(db: AsyncSession) -> int:
    """is_stale=True veya prototype_embedding NULL olan (metni dolu) kategorileri günceller."""
    rows = await db.execute(
        select(Category).where(
            Category.prototype_text.is_not(None),
            (Category.is_stale.is_(True)) | (Category.prototype_embedding.is_(None)),
        )
    )
    updated = 0
    for cat in rows.scalars().all():
        emb = compute_prototype_embedding(cat.prototype_text)
        if emb is not None:
            cat.prototype_embedding = emb
            cat.is_stale = False
            updated += 1
    if updated:
        await db.commit()
    return updated


async def load_category_protos(db: AsyncSession) -> list[CategoryProto]:
    """Aktif kategorileri sınıflandırıcının beklediği CategoryProto listesine çevirir."""
    rows = await db.execute(select(Category).where(Category.is_active.is_(True)))
    cats = rows.scalars().all()
    by_id = {c.id: c for c in cats}
    protos: list[CategoryProto] = []
    for c in cats:
        parent_slug = by_id[c.parent_id].slug if c.parent_id and c.parent_id in by_id else None
        emb = list(c.prototype_embedding) if c.prototype_embedding is not None else None
        protos.append(CategoryProto(slug=c.slug, parent_slug=parent_slug, embedding=emb))
    return protos
