"""
Kaynak bias verilerini PostgreSQL'den RAM'e yükleyen ve sorgulayan modül.
Her Celery worker process'i kendi cache'ini tutar; 24 saatte bir yenilenir.
"""
import logging
import time
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_BIAS_CACHE: dict[str, dict] = {}
_CACHE_LOADED_AT: float = 0.0
_CACHE_TTL: float = 86400.0  # 24 saat


def _extract_domain(raw: str) -> str:
    """URL veya domain string'inden temiz domain çıkarır, www. önekini kaldırır."""
    raw = raw.strip().lower()
    if raw.startswith(("http://", "https://")):
        raw = urlparse(raw).netloc
    return raw.removeprefix("www.")


def _load_from_db() -> dict[str, dict]:
    """PostgreSQL'den tüm source_bias kayıtlarını senkron olarak yükler."""
    try:
        from sqlalchemy import create_engine, text
        from app.core.config import settings

        sync_url = settings.DATABASE_URL.replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://"
        )
        engine = create_engine(sync_url, pool_pre_ping=True, pool_size=1, max_overflow=0)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM source_bias"))
            rows = result.fetchall()
            keys = result.keys()
        engine.dispose()

        cache = {}
        for row in rows:
            d = dict(zip(keys, row))
            cache[d["domain"]] = d
        logger.info("bias_cache: %d kaynak yüklendi.", len(cache))
        return cache
    except Exception as exc:
        logger.warning("bias_cache: DB yükleme başarısız: %s", exc)
        return {}


def _ensure_loaded() -> None:
    global _BIAS_CACHE, _CACHE_LOADED_AT
    if time.monotonic() - _CACHE_LOADED_AT > _CACHE_TTL:
        _BIAS_CACHE = _load_from_db()
        _CACHE_LOADED_AT = time.monotonic()


def get_bias(domain_or_url: str) -> dict | None:
    """
    Domain veya URL için bias kaydını döndürür.
    Bulunamazsa None. www. öneki normalize edilir.
    """
    _ensure_loaded()
    domain = _extract_domain(domain_or_url)
    return _BIAS_CACHE.get(domain)


def enrich_sources_with_bias(sources: list[dict]) -> list[dict]:
    """
    sources listesindeki her kaydı bias DB verileriyle zenginleştirir.
    Bilinmeyen domain için bias alanları None olarak eklenir.
    """
    _ensure_loaded()
    enriched = []
    for s in sources:
        domain = _extract_domain(s.get("domain", ""))
        bias = _BIAS_CACHE.get(domain)
        enriched.append({
            **s,
            "display_name":       bias["display_name"]       if bias else None,
            "political_lean":     bias["political_lean"]     if bias else None,
            "government_aligned": bias["government_aligned"] if bias else None,
            "owner_entity":       bias["owner_entity"]       if bias else None,
            "media_group":        bias["media_group"]        if bias else None,
        })
    return enriched


def compute_bias_summary(enriched_sources: list[dict]) -> dict:
    """
    Zenginleştirilmiş kaynak listesinden bias özeti üretir.
    Döndürür: {bias_summary: str, source_diversity_score: float}
    """
    total = len(enriched_sources)
    if total == 0:
        return {"bias_summary": "Kaynak bulunamadı.", "source_diversity_score": 0.0}

    known = [s for s in enriched_sources if s.get("political_lean") is not None]
    gov_count = sum(1 for s in enriched_sources if s.get("government_aligned"))

    if not known:
        return {
            "bias_summary": f"{total} kaynak bulundu ancak bias verisi bilinmiyor.",
            "source_diversity_score": 0.5,
        }

    gov_ratio = gov_count / total
    mean_lean = sum(s["political_lean"] for s in known) / len(known)
    diversity = round(1.0 - max(gov_ratio, abs(mean_lean)), 3)
    diversity = max(0.0, min(1.0, diversity))

    if gov_ratio >= 0.60:
        summary = (
            f"{total} kaynaktan {gov_count}'i devlet/hükümet yanlısı, "
            f"bağımsız doğrulama sınırlı (gov_ratio={gov_ratio:.0%})."
        )
    elif mean_lean > 0.40:
        summary = f"{total} kaynak genelde sağ/iktidar yanlısı eğilim gösteriyor (ort. lean={mean_lean:.2f})."
    elif mean_lean < -0.40:
        summary = f"{total} kaynak genelde sol/muhalif eğilim gösteriyor (ort. lean={mean_lean:.2f})."
    else:
        summary = f"{total} kaynak çeşitli siyasi yönelimleri temsil ediyor (ort. lean={mean_lean:.2f})."

    return {"bias_summary": summary, "source_diversity_score": diversity}
