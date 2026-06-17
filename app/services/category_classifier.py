"""
app/services/category_classifier.py
===================================
Saf (DB/model bağımsız) içerik-bazlı kategori atama mantığı.

Bir haberin embedding'ini kategori prototip vektörleriyle karşılaştırır:
  - alt kategori: seçilen ana kategori altında en yakın olan (eşik üstüyse) -> her zaman
  - ana kategori: sadece güven >= eşik VE feed tahmininden farklıysa ezilir
Embedding yok / sıfır vektör / aday yok -> feed tahmini korunur.
"""
from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class CategoryProto:
    slug: str
    parent_slug: Optional[str]          # None = ana kategori
    embedding: Optional[list[float]]    # None = prototip henüz yok


@dataclass
class CategoryResult:
    category: str
    subcategory: Optional[str]
    confidence: Optional[float]


def _cosine(a: list[float], b: list[float]) -> float:
    va = np.asarray(a, dtype=float)
    vb = np.asarray(b, dtype=float)
    na = float(np.linalg.norm(va))
    nb = float(np.linalg.norm(vb))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


def classify_category(
    embedding: Optional[list[float]],
    categories: list[CategoryProto],
    feed_category: str,
    feed_subcategory: Optional[str],
    main_threshold: float,
    sub_threshold: float,
) -> CategoryResult:
    # Guard: embedding yok veya tamamen sıfır -> feed tahmini kazanır
    if not embedding or not any(v != 0.0 for v in embedding):
        return CategoryResult(feed_category, feed_subcategory, None)

    mains = [c for c in categories if c.parent_slug is None and c.embedding]
    if not mains:
        return CategoryResult(feed_category, feed_subcategory, None)

    best_main, main_score = max(
        ((c, _cosine(embedding, c.embedding)) for c in mains),
        key=lambda t: t[1],
    )

    chosen_main = feed_category
    if best_main.slug != feed_category and main_score >= main_threshold:
        chosen_main = best_main.slug

    # Alt kategori seçilen ana kategoriye bağlı. Ana değiştiyse eski alt geçersiz.
    chosen_sub = feed_subcategory if chosen_main == feed_category else None

    subs = [c for c in categories if c.parent_slug == chosen_main and c.embedding]
    if subs:
        best_sub, sub_score = max(
            ((c, _cosine(embedding, c.embedding)) for c in subs),
            key=lambda t: t[1],
        )
        if sub_score >= sub_threshold:
            chosen_sub = best_sub.slug

    return CategoryResult(chosen_main, chosen_sub, round(main_score, 4))
