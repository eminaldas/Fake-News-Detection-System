"""
workers/rss_ingester.py
========================
RSS ingest + cosine dedup + Celerybeat cron.

Pattern: workers/tasks.py ile aynı yapı —
  - Celery init: broker=settings.REDIS_URL
  - asyncio.run() ile async fonksiyonları çağır
  - NullPool engine (worker process'ler için zorunlu)
"""

import asyncio
import hashlib
import logging
import re
import uuid as uuid_module
from datetime import datetime, timezone
from email.utils import mktime_tz, parsedate_tz
from io import BytesIO
from urllib.parse import urlparse

import feedparser
import httpx
import requests as _requests
import sqlalchemy
from PIL import Image
from redis.asyncio import from_url as redis_from_url
from sqlalchemy import select
from celery import Celery
from celery.schedules import crontab
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import NewsArticle

_WARM_WIDTH = 800
_WARM_TTL   = 3600  # proxy.py ile aynı


def _img_cache_key(url: str, width: int) -> str:
    h = hashlib.sha256(url.encode()).hexdigest()
    return f"imgproxy:{h}:{width}"


async def _warm_one(url: str) -> None:
    """Tek bir görseli indir, WebP'ye çevir, Redis'e yaz. Hata olursa sessizce atla."""
    if not url:
        return
    key = _img_cache_key(url, _WARM_WIDTH)
    try:
        redis = await redis_from_url(settings.REDIS_URL, decode_responses=False)
        if await redis.exists(key):
            return
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, follow_redirects=True)
        if r.status_code >= 400 or len(r.content) > 5 * 1024 * 1024:
            return
        img = Image.open(BytesIO(r.content)).convert("RGB")
        new_h = int(img.height * _WARM_WIDTH / img.width)
        img = img.resize((_WARM_WIDTH, new_h), Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, format="WEBP", quality=80)
        await redis.setex(key, _WARM_TTL, buf.getvalue())
        await redis.aclose()
    except Exception as exc:
        logger.debug("image_cache_warm skip url=%s err=%s", url, exc)

logger = logging.getLogger(__name__)

# Türkiye UTC+3. Feed'de timezone yoksa feedparser tuple'ı yerel saat gibi gelir,
# biz de UTC sanıp +0 ile kaydederiz → 3 saat ileri görünür.
# _parse_pub_date bu durumu yakalar ve UTC+3 varsayar.
_TR_UTC_OFFSET = 3 * 3600  # saniye cinsinden


def _normalize_raw_date(raw: str) -> str:
    """
    Non-standard timezone formatlarını RFC 2822 uyumlu hale getirir.
    GMT+3 → +0300, GMT-5 → -0500
    """
    return re.sub(
        r'\bGMT([+-])(\d{1,2})\b',
        lambda m: f"{m.group(1)}{int(m.group(2)):02d}00",
        raw,
    )


def _parse_pub_date(entry) -> datetime | None:
    raw = getattr(entry, "published", None) or getattr(entry, "updated", None)
    if raw:
        normalized = _normalize_raw_date(raw)
        tup = parsedate_tz(normalized)
        if tup:
            tz_offset = tup[9]
            if tz_offset is None:
                # Feed'de timezone yok → UTC+3 varsay
                ts = mktime_tz(tup[:9] + (_TR_UTC_OFFSET,))
            else:
                ts = mktime_tz(tup)
            return datetime.fromtimestamp(ts, tz=timezone.utc)
    # Fallback: feedparser tuple (timezone varsa feedparser UTC'ye çevirmiştir)
    pp = getattr(entry, "published_parsed", None)
    if pp:
        try:
            return datetime(*pp[:6], tzinfo=timezone.utc)
        except Exception:
            pass
    return None


# ── Celery app ────────────────────────────────────────────────────────────────
celery_app = Celery(
    "rss_ingester",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Istanbul",
    enable_utc=True,
)

# ── DB engine (NullPool — worker process'ler için) ───────────────────────────
engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── Celerybeat: sabit saatlerde günde 6 kez ──────────────────────────────────
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour="7,10,13,16,19,22", minute=0),
        ingest_rss_feeds.s(),
        name="rss-ingest-6x-daily",
    )


# ── Domain → trust score ──────────────────────────────────────────────────────
TRUST_SCORES = {
    "aa.com.tr":          1.0,
    "bbc.com":            1.0,
    "bbc.co.uk":          1.0,
    "trtworld.com":       1.0,
    "reuters.com":        1.0,
    "euronews.com":       0.9,
    "tr.euronews.com":    0.9,
    "cnnturk.com":        0.9,
    "ntv.com.tr":         0.9,
    "trthaber.com":       0.9,
    "trtspor.com.tr":     0.9,
    "dw.com":             0.9,
    "indyturk.com":       0.85,
    "t24.com.tr":         0.8,
    "haberturk.com":      0.8,
    "hurriyet.com.tr":    0.8,
    "milliyet.com.tr":    0.8,
    "cumhuriyet.com.tr":  0.8,
    "bianet.org":         0.8,
    "dunya.com":          0.8,
    "gazeteduvar.com.tr": 0.8,
    "sozcu.com.tr":       0.75,
    "sabah.com.tr":       0.7,
    "ahaber.com.tr":      0.7,
    "fanatik.com.tr":     0.7,
    "sporx.com":          0.7,
    "ensonhaber.com":     0.6,
    "yenisafak.com":      0.6,
    "mynet.com":          0.6,
    "internethaber.com":  0.6,
    "tele1.com.tr":       0.6,
    "yeniakit.com.tr":    0.5,
    "sputniknews.com":    0.5,
}


# ── URL slug → (category, subcategory) ───────────────────────────────────────
SLUG_MAP = {
    # Gündem
    "gundem":           ("gündem", None),
    "turkiye":          ("gündem", "türkiye"),
    "dunya":            ("gündem", "dünya"),
    "siyaset":          ("gündem", "siyaset"),
    "sondakika":        ("gündem", "son dakika"),
    "son_dakika":       ("gündem", "son dakika"),
    "guncel":           ("gündem", None),
    "analiz":           ("gündem", "analiz"),
    "all":              ("gündem", None),
    # Ekonomi
    "ekonomi":          ("ekonomi", None),
    "finans":           ("ekonomi", "finans"),
    "borsa":            ("ekonomi", "borsa"),
    "piyasa":           ("ekonomi", "piyasa"),
    # Spor
    "spor":             ("spor", None),
    "galatasaray":      ("spor", "futbol"),
    "fenerbahce":       ("spor", "futbol"),
    "besiktas":         ("spor", "futbol"),
    "trabzonspor":      ("spor", "futbol"),
    "bursaspor":        ("spor", "futbol"),
    "basketbol":        ("spor", "basketbol"),
    # Sağlık
    "saglik":           ("sağlık", None),
    "diyet":            ("sağlık", "beslenme"),
    "koronavirus":      ("sağlık", None),
    "bilim":            ("sağlık", "bilim"),
    # Teknoloji — bilim_teknoloji bilim'den önce gelmeli (URL substring eşleşmesi)
    "bilim_teknoloji":  ("teknoloji", "bilim"),
    "teknoloji":        ("teknoloji", None),
    "bilim-teknoloji":  ("teknoloji", "bilim"),
    "oyun":             ("teknoloji", "oyun"),
    "otomobil":         ("teknoloji", "otomobil"),
    "otomotiv":         ("teknoloji", "otomobil"),
    # Kültür & Sanat
    "kultur-sanat":     ("kültür", "sanat"),
    "kultursanat":      ("kültür", "sanat"),
    "kultur":           ("kültür", None),
    "sinema":           ("kültür", "sinema"),
    "tiyatro":          ("kültür", "tiyatro"),
    "muzik":            ("kültür", "müzik"),
    "kitap":            ("kültür", "kitap"),
    # Yaşam
    "aktuel":           ("gündem", None),
    "magazin":          ("yaşam", "magazin"),
    "yasam":            ("yaşam", None),
    "hayat":            ("yaşam", None),
    "kadin":            ("yaşam", None),
    "is-yasam":         ("yaşam", None),
    "seyahat":          ("yaşam", "seyahat"),
    "turizm":           ("yaşam", "seyahat"),
    "tatil":            ("yaşam", "seyahat"),
    "aile":             ("yaşam", "aile"),
    "yemek":            ("yaşam", "yemek"),
    "gida":             ("yaşam", "yemek"),
    "egitim":           ("yaşam", "eğitim"),
    # Gündem alt
    "manset":           ("gündem", None),
    "yerel-haberler":   ("gündem", "yerel"),
    "yerel":            ("gündem", "yerel"),
}


# ── RSS kaynakları: (url, source_name) ───────────────────────────────────────
RSS_SOURCES = [
    # ── BBC Türkçe (güvenilir, görselli) ─────────────────────────────────────
    ("https://www.bbc.com/turkce/index.xml",                       "BBC Türkçe"),
    ("https://www.bbc.com/turkce/ekonomi/index.xml",               "BBC Türkçe"),
    ("https://www.bbc.com/turkce/spor/index.xml",                  "BBC Türkçe"),
    # ── Anadolu Ajansı (güvenilir, görselli) ─────────────────────────────────
    ("https://www.aa.com.tr/tr/rss/default?cat=gundem",            "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=ekonomi",           "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=spor",              "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=saglik",            "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=teknoloji",         "AA"),
    # ── CNN Türk ─────────────────────────────────────────────────────────────
    ("https://www.cnnturk.com/feed/rss/turkiye/news",              "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/dunya/news",                "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/ekonomi/news",              "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/spor/news",                 "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/teknoloji/news",            "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/saglik/news",               "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/magazin/news",              "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/kultur-sanat/news",         "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/yasam/news",                "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/otomobil/news",             "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/seyahat/news",              "CNN Türk"),
    # ── NTV ──────────────────────────────────────────────────────────────────
    ("https://www.ntv.com.tr/gundem.rss",                          "NTV"),
    ("https://www.ntv.com.tr/ekonomi.rss",                         "NTV"),
    ("https://www.ntv.com.tr/spor.rss",                            "NTV"),
    ("https://www.ntv.com.tr/teknoloji.rss",                       "NTV"),
    ("https://www.ntv.com.tr/saglik.rss",                          "NTV"),
    # ── TRT Haber ────────────────────────────────────────────────────────────
    ("https://www.trthaber.com/sondakika.rss",                          "TRT Haber"),
    ("https://www.trthaber.com/spor.rss",                               "TRT Haber"),
    ("https://www.trthaber.com/ekonomi.rss",                            "TRT Haber"),
    ("https://www.trthaber.com/teknoloji.rss",                          "TRT Haber"),
    ("https://www.trthaber.com/manset_articles.rss",                    "TRT Haber"),
    ("https://www.trthaber.com/gundem_articles.rss",                    "TRT Haber"),
    ("https://www.trthaber.com/turkiye_articles.rss",                   "TRT Haber"),
    ("https://www.trthaber.com/dunya_articles.rss",                     "TRT Haber"),
    ("https://www.trthaber.com/yasam_articles.rss",                     "TRT Haber"),
    ("https://www.trthaber.com/saglik_articles.rss",                    "TRT Haber"),
    ("https://www.trthaber.com/kultur_sanat_articles.rss",              "TRT Haber"),
    ("https://www.trthaber.com/bilim_teknoloji_articles.rss",           "TRT Haber"),
    ("https://www.trthaber.com/guncel_articles.rss",                    "TRT Haber"),
    ("https://www.trthaber.com/egitim_articles.rss",                    "TRT Haber"),
    ("https://www.trthaber.com/koronavirus_articles.rss",               "TRT Haber"),
    # ── TRT Spor (güvenilir, görselli) ───────────────────────────────────────
    ("https://www.trtspor.com.tr/rss/spor.rss",                    "TRT Spor"),
    # ── Euronews Türkçe (güvenilir, görselli) ────────────────────────────────
    ("https://tr.euronews.com/rss?format=mrss&level=theme&name=news", "Euronews TR"),
    # ── DW Türkçe (güvenilir, görsel yok) ────────────────────────────────────
    ("https://rss.dw.com/rdf/rss-tur-all",                         "DW Türkçe"),
    # ── IndyTürk / The Independent (güvenilir, görselli) ─────────────────────
    ("https://www.indyturk.com/rss.xml",                           "IndyTürk"),
    # ── T24 (güvenilir, görselli) ─────────────────────────────────────────────
    ("https://t24.com.tr/rss",                                     "T24"),
    # ── Gazete Duvar ──────────────────────────────────────────────────────────
    ("https://www.gazeteduvar.com.tr/feed",                        "Gazete Duvar"),
    # ── Bianet ───────────────────────────────────────────────────────────────
    ("https://bianet.org/biamag/rss",                              "Bianet"),
    # ── Hürriyet ──────────────────────────────────────────────────────────────
    ("https://www.hurriyet.com.tr/rss/gundem",                     "Hürriyet"),
    ("https://www.hurriyet.com.tr/rss/ekonomi",                    "Hürriyet"),
    ("https://www.hurriyet.com.tr/rss/spor",                       "Hürriyet"),
    ("https://www.hurriyet.com.tr/rss/teknoloji",                  "Hürriyet"),
    # ── Milliyet ──────────────────────────────────────────────────────────────
    ("https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml",       "Milliyet"),
    ("https://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml",      "Milliyet"),
    ("https://www.milliyet.com.tr/rss/rssNew/sporRss.xml",         "Milliyet"),
    # ── Sözcü ────────────────────────────────────────────────────────────────
    ("https://www.sozcu.com.tr/rss/gundem.xml",                    "Sözcü"),
    ("https://www.sozcu.com.tr/rss/ekonomi.xml",                   "Sözcü"),
    ("https://www.sozcu.com.tr/rss/spor.xml",                      "Sözcü"),
    # ── Cumhuriyet ───────────────────────────────────────────────────────────
    ("https://www.cumhuriyet.com.tr/rss/son_dakika.xml",           "Cumhuriyet"),
    ("https://www.cumhuriyet.com.tr/rss/ekonomi.xml",              "Cumhuriyet"),
    # ── HaberTürk ────────────────────────────────────────────────────────────
    ("https://www.haberturk.com/rss/gundem.xml",                        "Haberturk"),
    ("https://www.haberturk.com/rss/ekonomi.xml",                       "Haberturk"),
    ("https://www.haberturk.com/rss/spor.xml",                          "Haberturk"),
    ("https://www.haberturk.com/rss/manset.xml",                        "Haberturk"),
    ("https://www.haberturk.com/rss/magazin.xml",                       "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/siyaset.xml",              "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/saglik.xml",               "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/dunya.xml",                "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/yasam.xml",                "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/kultur-sanat.xml",         "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/sinema.xml",               "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/teknoloji.xml",            "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/otomobil.xml",             "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/kadin.xml",                "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/tatil.xml",                "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/is-yasam.xml",             "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/gida.xml",                 "Haberturk"),
    ("https://www.haberturk.com/rss/kategori/kitap.xml",                "Haberturk"),
    ("https://www.haberturk.com/rss/yerel-haberler.xml",                "Haberturk"),
    # ── Sabah ────────────────────────────────────────────────────────────────
    ("https://www.sabah.com.tr/rss/gundem.xml",                    "Sabah"),
    ("https://www.sabah.com.tr/rss/ekonomi.xml",                   "Sabah"),
    ("https://www.sabah.com.tr/rss/spor.xml",                      "Sabah"),
    ("https://www.sabah.com.tr/rss/teknoloji.xml",                 "Sabah"),
    ("https://www.sabah.com.tr/rss/galatasaray.xml",               "Sabah"),
    ("https://www.sabah.com.tr/rss/fenerbahce.xml",                "Sabah"),
    ("https://www.sabah.com.tr/rss/besiktas.xml",                  "Sabah"),
    # ── A Haber ──────────────────────────────────────────────────────────────
    ("https://www.ahaber.com.tr/rss/gundem.xml",                   "A Haber"),
    ("https://www.ahaber.com.tr/rss/ekonomi.xml",                  "A Haber"),
    ("https://www.ahaber.com.tr/rss/spor.xml",                     "A Haber"),
    # ── Yeni Şafak (kategori bazlı) ───────────────────────────────────────────
    ("https://www.yenisafak.com/rss-feeds?category=gundem",        "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=dunya",         "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=spor",          "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=ekonomi",       "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=teknoloji",     "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=saglik",        "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=hayat",         "Yeni Şafak"),
    ("https://www.yenisafak.com/rss-feeds?category=kultur-sanat",  "Yeni Şafak"),
    # ── Ensonhaber ───────────────────────────────────────────────────────────
    ("https://www.ensonhaber.com/rss/ensonhaber.xml",              "Ensonhaber"),
    # ── Dünya (ekonomi ağırlıklı) ─────────────────────────────────────────────
    ("https://www.dunya.com/rss/gundem.xml",                       "Dünya"),
    ("https://www.dunya.com/rss/ekonomi.xml",                      "Dünya"),
    # ── Fanatik (spor) ────────────────────────────────────────────────────────
    ("https://www.fanatik.com.tr/rss/spor.xml",                    "Fanatik"),
    ("https://www.fanatik.com.tr/rss/galatasaray.xml",             "Fanatik"),
    ("https://www.fanatik.com.tr/rss/fenerbahce.xml",              "Fanatik"),
    ("https://www.fanatik.com.tr/rss/besiktas.xml",                "Fanatik"),
    # ── Mynet ────────────────────────────────────────────────────────────────
    ("https://www.mynet.com/gundem/rss",                           "Mynet"),
    ("https://www.mynet.com/spor/rss",                             "Mynet"),
    ("https://www.mynet.com/ekonomi/rss",                          "Mynet"),
]


# ── Yardımcı: domain'den trust score al ──────────────────────────────────────
def _get_trust_score(url: str) -> float:
    try:
        domain = urlparse(url).netloc.lower().lstrip("www.")
        for key, score in TRUST_SCORES.items():
            if domain == key or domain.endswith("." + key):
                return score
    except Exception:
        pass
    return 0.5


# ── Yardımcı: RSS URL'inden kategori/subcategory çıkar ───────────────────────
def _get_category(rss_url: str) -> tuple:
    url_lower = rss_url.lower()
    for slug, (cat, subcat) in SLUG_MAP.items():
        if f"/{slug}" in url_lower or f"={slug}" in url_lower or f"_{slug}" in url_lower:
            return cat, subcat
    return "gündem", None


# ── Yardımcı: RSS entry'sinden image URL çıkar ───────────────────────────────
def _extract_image(entry) -> str | None:
    # 1. <media:content> (standart)
    media_content = getattr(entry, "media_content", None)
    if media_content and isinstance(media_content, list):
        for mc in media_content:
            url = mc.get("url") or mc.get("href")
            if url:
                return url

    # 2. <media:thumbnail>
    media_thumbnail = getattr(entry, "media_thumbnail", None)
    if media_thumbnail and isinstance(media_thumbnail, list):
        url = media_thumbnail[0].get("url") or media_thumbnail[0].get("href")
        if url:
            return url

    # 3. <enclosure type="image/...">
    enclosures = getattr(entry, "enclosures", None)
    if enclosures:
        for enc in enclosures:
            if "image" in enc.get("type", ""):
                return enc.get("href") or enc.get("url")

    # 4. <image> tag'i — AA, CNN Türk, Yeni Şafak custom field
    #    feedparser bunu dict, string ya da FeedParserDict olarak döndürebilir
    image_tag = entry.get("image") if hasattr(entry, "get") else getattr(entry, "image", None)
    if image_tag:
        if isinstance(image_tag, dict):
            url = (image_tag.get("href") or image_tag.get("url")
                   or image_tag.get("value") or image_tag.get("content"))
            if url and url.startswith("http"):
                return url
        elif isinstance(image_tag, str) and image_tag.startswith("http"):
            return image_tag

    # 5. links içinde image ilişkisi
    links = getattr(entry, "links", None)
    if links:
        for lnk in links:
            if "image" in lnk.get("type", "") and lnk.get("href"):
                return lnk["href"]

    # 6. Fallback: summary / description / content içindeki <img src="..."> tag
    for field in ("summary", "description"):
        text = getattr(entry, field, None) or ""
        if text:
            m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', text, re.IGNORECASE)
            if m and m.group(1).startswith("http"):
                return m.group(1)
    content_list = getattr(entry, "content", None)
    if content_list and isinstance(content_list, list):
        for c in content_list:
            text = c.get("value", "") if isinstance(c, dict) else ""
            if text:
                m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', text, re.IGNORECASE)
                if m and m.group(1).startswith("http"):
                    return m.group(1)

    return None


# ── Yardımcı: ham RSS XML'den item-level <image> tag'lerini çıkar ─────────────
# feedparser item-level custom <image> tag'ini (CNN Türk, AA, Yeni Şafak gibi)
# parse etmiyor. Bu fonksiyon ham XML'i regex ile tarar ve link→url map'i döner.
def _raw_image_map(rss_url: str) -> dict:
    try:
        resp = _requests.get(
            rss_url, timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)"},
        )
        raw = resp.text
    except Exception:
        return {}

    result = {}
    items = re.findall(r"<item[^>]*>(.*?)</item>", raw, re.DOTALL | re.IGNORECASE)
    for item_xml in items:
        # link veya guid'den entry key'i çıkar
        lm = re.search(
            r"<link[^>]*>(?:<!\[CDATA\[)?\s*(https?://[^\]\s<]+)",
            item_xml, re.IGNORECASE,
        ) or re.search(
            r"<guid[^>]*>(?:<!\[CDATA\[)?\s*(https?://[^\]\s<]+)",
            item_xml, re.IGNORECASE,
        )
        if not lm:
            continue
        link = lm.group(1).strip().rstrip("]]>").strip()

        # <image>URL</image>  (CNN Türk, AA)
        m = re.search(r"<image[^>]*>\s*(https?://[^\s<]+)\s*</image>",
                      item_xml, re.IGNORECASE)
        if m:
            result[link] = m.group(1).strip()
            continue

        # <image><url>URL</url></image>  (Yeni Şafak)
        m = re.search(r"<image[^>]*>.*?<url[^>]*>\s*(https?://[^\s<]+)",
                      item_xml, re.DOTALL | re.IGNORECASE)
        if m:
            result[link] = m.group(1).strip()

    return result


# ── Yardımcı: cosine similarity ile dedup kontrol ────────────────────────────
async def _find_duplicate(db: AsyncSession, title: str) -> NewsArticle | None:
    """
    pg_trgm trigram benzerliğiyle duplicate bul.
    Son 24 saatteki kayıtlarda similarity > 0.65 ise aynı haber sayılır.
    """
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    sql = sqlalchemy.text(
        """
        SELECT id FROM news_articles
        WHERE created_at >= :cutoff
          AND similarity(title, :title) > 0.65
        ORDER BY similarity(title, :title) DESC
        LIMIT 1
        """
    )
    result = await db.execute(sql, {"cutoff": cutoff, "title": title})
    row = result.fetchone()
    if row:
        return await db.get(NewsArticle, row.id)
    return None


# ── Ana ingest fonksiyonu (async) ─────────────────────────────────────────────
async def _ensure_pg_trgm():
    async with AsyncSessionLocal() as db:
        await db.execute(sqlalchemy.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await db.commit()


async def _run_ingest():
    await _ensure_pg_trgm()
    urls_to_warm: list[str] = []
    async with AsyncSessionLocal() as db:
        total_new = 0
        total_dup = 0

        for rss_url, source_name in RSS_SOURCES:
            source_new       = 0
            source_clustered = 0
            try:
                feed = feedparser.parse(rss_url)
                entries = feed.entries[: settings.RSS_INGEST_BATCH]
            except Exception as exc:
                logger.warning("rss.fetch_error url=%s err=%s", rss_url, exc)
                continue

            # feedparser item-level <image> tag'ini parse etmiyor;
            # ham XML'den ayrıca çıkar (CNN Türk, AA, Yeni Şafak için)
            img_map = _raw_image_map(rss_url)

            trust_score = _get_trust_score(rss_url)
            category, subcategory = _get_category(rss_url)

            for entry in entries:
                title = (getattr(entry, "title", "") or "").strip()
                if not title:
                    continue

                content = (
                    getattr(entry, "summary", "")
                    or getattr(entry, "description", "")
                    or ""
                ).strip()

                source_url = getattr(entry, "link", "") or ""

                # URL daha önce alınmışsa atla (aynı kaynak tekrar ingest / farklı feed)
                if source_url:
                    exists = await db.execute(
                        select(NewsArticle.id).where(NewsArticle.source_url == source_url).limit(1)
                    )
                    if exists.scalar_one_or_none():
                        continue

                image_url  = _extract_image(entry) or img_map.get(source_url)

                pub_date = _parse_pub_date(entry)

                duplicate = await _find_duplicate(db, title)

                # cluster_id: yeni haber ise kendi id'si, duplicate ise canonical'ın cluster_id'si
                if duplicate:
                    cluster_id = duplicate.cluster_id or duplicate.id
                    # Canonical kaydı güncelle: sayaç, görsel, güvenilirlik
                    duplicate.source_count += 1
                    if not duplicate.image_url and image_url:
                        duplicate.image_url = image_url
                    if trust_score > (duplicate.trust_score or 0):
                        duplicate.trust_score = trust_score
                else:
                    cluster_id = None  # aşağıda article_id ile dolacak

                article_id = uuid_module.uuid4()
                if cluster_id is None:
                    cluster_id = article_id

                article = NewsArticle(
                    id           = article_id,
                    title        = title,
                    content      = content,
                    embedding    = None,
                    category     = category,
                    subcategory  = subcategory,
                    image_url    = image_url,
                    source_name  = source_name,
                    source_url   = source_url,
                    trust_score  = trust_score,
                    pub_date     = pub_date,
                    cluster_id   = cluster_id,
                    source_count = 1,
                    label        = None,
                    label_source = None,
                    nlp_score    = None,
                    nlp_signals  = None,
                    content_type = None,
                )
                db.add(article)
                if image_url:
                    urls_to_warm.append(image_url)
                source_new += 1
                total_new  += 1
                if duplicate:
                    source_clustered += 1

            await db.commit()
            logger.info(
                "rss.source_done source=%s new=%d clustered=%d",
                source_name, source_new, source_clustered,
            )

        logger.info("rss.ingest_complete total_new=%d", total_new)

    if urls_to_warm:
        logger.info("image_cache_warm start count=%d", len(urls_to_warm))
        await asyncio.gather(*[_warm_one(u) for u in urls_to_warm], return_exceptions=True)
        logger.info("image_cache_warm done")


# ── Celery task ───────────────────────────────────────────────────────────────
@celery_app.task(name="workers.rss_ingester.ingest_rss_feeds", queue=settings.RSS_INGEST_QUEUE)
def ingest_rss_feeds():
    logger.info("rss.task_start")
    asyncio.run(_run_ingest())
    logger.info("rss.task_done")
