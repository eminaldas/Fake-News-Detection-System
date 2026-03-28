"""
NER tabanlı anahtar varlık çıkarımı ve DuckDuckGo haber araması.
Gemini prompt'u için doğrulanmış, erişilebilir kanıt listesi üretir.
"""

import re
import logging
import requests
from ddgs import DDGS

logger = logging.getLogger(__name__)

# ─── NER desenleri — öncelik sırası: TAM AD > KURUM > YER > TEK KELİME ───────
_ENTITY_PATTERNS = [
    r'\b[A-ZÇĞİÖŞÜ][a-zçğışöüa-z]+ [A-ZÇĞİÖŞÜ][a-zçğışöüa-z]+\b',
    r'\b(AKP|CHP|MHP|HDP|İYİ Parti|TBMM|NATO|AB|BM|TÜİK|AFAD|BOTAŞ|EPDK|BDDK)\b',
    r'\b(İstanbul|Ankara|İzmir|Türkiye|Suriye|Rusya|ABD|Irak|İran|Yunanistan|Almanya)\b',
    r'\b[A-ZÇĞİÖŞÜ][a-zçğışöüa-z]{3,}\b',
]

# ─── Prompt injection koruması ────────────────────────────────────────────────
_INJECTION_PATTERNS = re.compile(
    r'\[SİSTEM\]|\[SYSTEM\]|\[GÖREV\]|ignore previous|önceki talimatları unut|'
    r'forget instructions|\[HABER\]|verdict\s*:|```json|</?script',
    re.IGNORECASE,
)


def sanitize_for_prompt(text: str, max_len: int = 800) -> str:
    """Kullanıcı metnini Gemini prompt'una göndermeden önce temizler."""
    cleaned = _INJECTION_PATTERNS.sub('***', text)
    return cleaned[:max_len]


def extract_entities(text: str, max_entities: int = 3) -> list[str]:
    """
    Metinden en ayırt edici varlıkları çıkarır.
    Öncelik: TAM AD > KURUM > YER > tek kelime özel isim > uzun kelime fallback.
    """
    found: list[str] = []

    for pattern in _ENTITY_PATTERNS:
        matches = re.findall(pattern, text)
        for m in matches:
            already_covered = any(
                m in existing and m != existing for existing in found
            )
            if m not in found and not already_covered:
                found.append(m)
        if len(found) >= max_entities:
            break

    if not found:
        words = [w for w in text.split() if len(w) >= 6 and w[0].isupper()]
        found = list(dict.fromkeys(words))[:max_entities]

    return found[:max_entities]


def _is_url_accessible(url: str, timeout: int = 4) -> bool:
    """
    URL'ye HEAD isteği atar. HTTP status < 400 ise erişilebilir sayar.
    Hata durumunda False döner.
    SSRF koruması: yalnızca http/https scheme'li URL'lere istek atar.
    """
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
        resp = requests.head(
            url,
            timeout=timeout,
            allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        return resp.status_code < 400
    except Exception:
        return False


def search_duckduckgo(query: str, max_results: int = 5) -> list[dict]:
    """
    DuckDuckGo ile Türkçe haber araması yapar.
    Döndürülen dict: {"title": str, "url": str, "date": str | None}
    """
    if not query.strip():
        return []
    try:
        results = []
        with DDGS(timeout=10) as ddgs:
            for r in ddgs.text(
                query,
                region="tr-tr",
                safesearch="off",
                max_results=max_results,
            ):
                title = (r.get("title") or "").strip()
                url   = (r.get("href")  or "").strip()
                date  = (r.get("published") or r.get("date") or None)
                if title and url:
                    results.append({"title": title[:200], "url": url, "date": date})
        return results
    except Exception as exc:
        logger.warning("DuckDuckGo araması başarısız: %s", exc)
        return []


def gather_evidence(text: str, max_results: int = 3) -> list[dict]:
    """
    Ana fonksiyon: haber metni → erişilebilir kanıt listesi.

    1. NER ile anahtar varlıklar çıkarılır.
    2. DuckDuckGo ile arama yapılır.
    3. Her URL için erişilebilirlik kontrolü (HEAD isteği).
    4. Erişilemeyen URL'ler atılır.
    5. En fazla max_results erişilebilir sonuç döner.

    Hata durumunda boş liste döner — Gemini çağrısı kanıtsız devam eder.
    """
    entities = extract_entities(text)
    if not entities:
        logger.debug("Hiç varlık çıkarılamadı, kanıt arama atlanıyor.")
        return []

    query = " ".join(entities)
    logger.info("Kanıt araması: '%s'", query)

    candidates = search_duckduckgo(query, max_results=max_results * 2)

    verified: list[dict] = []
    for item in candidates:
        if len(verified) >= max_results:
            break
        if _is_url_accessible(item["url"]):
            verified.append(item)
        else:
            logger.debug("Erişilemeyen URL atlandı: %s", item["url"])

    logger.info("Doğrulanmış kanıt sayısı: %d", len(verified))
    return verified
