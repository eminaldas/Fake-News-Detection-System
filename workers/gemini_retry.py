# workers/gemini_retry.py
"""
Gemini generate_content için retry + fallback yardımcı modülü.
Primary model (GEMINI_MODEL) 503/aşırı yük dönerse kısa beklemeyle tekrar dener;
yine olmazsa yedek modele (GEMINI_FALLBACK_MODEL) düşer. Tümü başarısızsa son hatayı raise eder.
"""
import logging
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

# Geçici (retry edilebilir) hata işaretleri — büyük/küçük harf duyarsız aranır
_TRANSIENT_MARKERS = (
    "503", "unavailable", "429", "overloaded",
    "high demand", "resource_exhausted", "try again",
)


def _is_transient(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(m in msg for m in _TRANSIENT_MARKERS)


def generate_with_fallback(client, contents, config, *, retries: int = 2):
    """client.models.generate_content'i primary modelle retry'lı çağırır;
    geçici hatada yedek modele düşer.

    - primary = settings.GEMINI_MODEL, fallback = settings.GEMINI_FALLBACK_MODEL
    - Her model için en fazla `retries` deneme (geçici hatada kısa backoff).
    - Geçici OLMAYAN hata → o model için durur, yedek modele geçer.
    - Tüm modeller/denemeler başarısızsa en son hatayı raise eder (çağıran yakalar).
    """
    primary  = settings.GEMINI_MODEL
    fallback = getattr(settings, "GEMINI_FALLBACK_MODEL", "") or ""
    models = [primary]
    if fallback and fallback != primary:
        models.append(fallback)

    last_exc = None
    for model in models:
        for attempt in range(max(1, retries)):
            try:
                return client.models.generate_content(
                    model=model, contents=contents, config=config,
                )
            except Exception as exc:  # noqa: BLE001 — tüm sağlayıcı hatalarını ele al
                last_exc = exc
                transient = _is_transient(exc)
                logger.warning(
                    "gemini: model=%s deneme=%d başarısız (transient=%s): %s",
                    model, attempt + 1, transient, exc,
                )
                if transient and attempt < retries - 1:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                break  # bu model bitti → sonraki modele geç
    raise last_exc
