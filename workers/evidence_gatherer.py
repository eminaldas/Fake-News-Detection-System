"""
NER tabanlı anahtar varlık çıkarımı ve Google News RSS araması.
Gemini prompt'u için kanıt listesi üretir.
"""

import re
import logging
import feedparser
from urllib.parse import quote

logger = logging.getLogger(__name__)

# ─── NER desenleri — öncelik sırası: TAM AD > KURUM > YER > TEK KELİME ───────
_ENTITY_PATTERNS = [
    # İki büyük harfle başlayan Türkçe ad-soyad (Recep Tayyip, Mehmet Şimşek)
    r'\b[A-ZÇĞİÖŞÜ][a-zçğışöüa-z]+ [A-ZÇĞİÖŞÜ][a-zçğışöüa-z]+\b',
    # Yaygın Türkçe kurum kısaltmaları
    r'\b(AKP|CHP|MHP|HDP|İYİ Parti|TBMM|NATO|AB|BM|TÜİK|AFAD|BOTAŞ|EPDK|BDDK)\b',
    # Yaygın yer adları
    r'\b(İstanbul|Ankara|İzmir|Türkiye|Suriye|Rusya|ABD|Irak|İran|Yunanistan|Almanya)\b',
    # Tek kelime özel isimler: büyük harfle başlar, min 4 karakter (Erdoğan, Kılıçdaroğlu)
    # Not: a-z aralığı Türkçe karakterleri kapsamaz; ğ,ş,ı,ö,ü,ç açıkça eklendi.
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

    Tekrar önleme: tek kelimeli eşleşme zaten bulunan çok kelimeli bir varlığın
    parçasıysa atlanır (örn. 'Recep Tayyip' varken 'Recep' eklenmez).
    """
    found: list[str] = []

    for pattern in _ENTITY_PATTERNS:
        matches = re.findall(pattern, text)
        for m in matches:
            # Çok kelimeli bir eşleşmenin alt kümesiyse atla
            already_covered = any(
                m in existing and m != existing for existing in found
            )
            if m not in found and not already_covered:
                found.append(m)
        if len(found) >= max_entities:
            break

    # Fallback: hiç varlık bulunamazsa 6+ karakterli büyük harfle başlayan kelimeler
    if not found:
        words = [w for w in text.split() if len(w) >= 6 and w[0].isupper()]
        found = list(dict.fromkeys(words))[:max_entities]

    return found[:max_entities]


def search_google_news_rss(query: str, max_results: int = 3) -> list[dict]:
    """Google News RSS'ten Türkçe haber araması yapar."""
    if not query.strip():
        return []
    url = (
        f"https://news.google.com/rss/search"
        f"?q={quote(query)}&hl=tr&gl=TR&ceid=TR:tr"
    )
    try:
        feed = feedparser.parse(url)
        results = []
        for entry in feed.entries[:max_results]:
            title = entry.get("title", "").strip()
            link  = entry.get("link", "").strip()
            if title and link:
                results.append({"title": title[:200], "url": link})
        return results
    except Exception as exc:
        logger.warning("Google News RSS araması başarısız: %s", exc)
        return []


def gather_evidence(text: str) -> list[dict]:
    """
    Ana fonksiyon: haber metni → kanıt listesi.
    Hata durumunda boş liste döner — Gemini çağrısı kanıtsız devam eder.
    """
    entities = extract_entities(text)
    if not entities:
        logger.debug("Hiç varlık çıkarılamadı, kanıt arama atlanıyor.")
        return []
    query = " ".join(entities)
    logger.info("Kanıt araması: '%s'", query)
    return search_google_news_rss(query, max_results=3)
