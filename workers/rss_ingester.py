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
import logging
import uuid as uuid_module
from datetime import datetime, timezone
from urllib.parse import urlparse

import feedparser
import sqlalchemy
from celery import Celery
from celery.schedules import crontab
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.models import NewsArticle
from ml_engine.vectorizer import TurkishVectorizer

vectorizer = TurkishVectorizer()

logger = logging.getLogger(__name__)

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
    "bbc.co.uk":          1.0,
    "trtworld.com":       1.0,
    "reuters.com":        1.0,
    "cnnturk.com":        0.9,
    "ntv.com.tr":         0.9,
    "trthaber.com":       0.9,
    "dw.com":             0.9,
    "haberturk.com":      0.8,
    "hurriyet.com.tr":    0.8,
    "milliyet.com.tr":    0.8,
    "cumhuriyet.com.tr":  0.8,
    "dunya.com":          0.8,
    "sabah.com.tr":       0.7,
    "ahaber.com.tr":      0.7,
    "takvim.com.tr":      0.6,
    "ensonhaber.com":     0.6,
    "yenisafak.com":      0.6,
    "yeniakit.com.tr":    0.5,
    "sputniknews.com":    0.5,
    "mynet.com":          0.6,
    "sozcu.com.tr":       0.7,
    "internethaber.com":  0.6,
    "tele1.com.tr":       0.6,
    "gazeteduvar.com.tr": 0.7,
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
    "bilim":            ("sağlık", "bilim"),
    # Teknoloji
    "teknoloji":        ("teknoloji", None),
    "bilim-teknoloji":  ("teknoloji", "bilim"),
    "oyun":             ("teknoloji", "oyun"),
    "otomobil":         ("teknoloji", "otomobil"),
    "otomotiv":         ("teknoloji", "otomobil"),
    # Kültür & Yaşam
    "kultur-sanat":     ("kültür", "sanat"),
    "magazin":          ("yaşam", "magazin"),
    "yasam":            ("yaşam", None),
    "seyahat":          ("yaşam", "seyahat"),
    "turizm":           ("yaşam", "seyahat"),
    "aile":             ("yaşam", "aile"),
    "yemek":            ("yaşam", "yemek"),
    "egitim":           ("yaşam", "eğitim"),
}


# ── RSS kaynakları: (url, source_name) ───────────────────────────────────────
RSS_SOURCES = [
    # Anadolu Ajansı
    ("https://www.aa.com.tr/tr/rss/default?cat=gundem",        "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=ekonomi",       "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=spor",          "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=saglik",        "AA"),
    ("https://www.aa.com.tr/tr/rss/default?cat=teknoloji",     "AA"),
    # CNN Türk
    ("https://www.cnnturk.com/feed/rss/turkiye/news",          "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/ekonomi/news",          "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/spor/news",             "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/teknoloji/news",        "CNN Türk"),
    ("https://www.cnnturk.com/feed/rss/saglik/news",           "CNN Türk"),
    # NTV
    ("https://www.ntv.com.tr/gundem.rss",                      "NTV"),
    ("https://www.ntv.com.tr/ekonomi.rss",                     "NTV"),
    ("https://www.ntv.com.tr/spor.rss",                        "NTV"),
    ("https://www.ntv.com.tr/teknoloji.rss",                   "NTV"),
    ("https://www.ntv.com.tr/saglik.rss",                      "NTV"),
    # TRT Haber
    ("https://www.trthaber.com/sondakika.rss",                 "TRT Haber"),
    ("https://www.trthaber.com/spor.rss",                      "TRT Haber"),
    ("https://www.trthaber.com/ekonomi.rss",                   "TRT Haber"),
    # Hürriyet
    ("https://www.hurriyet.com.tr/rss/gundem",                 "Hürriyet"),
    ("https://www.hurriyet.com.tr/rss/ekonomi",                "Hürriyet"),
    ("https://www.hurriyet.com.tr/rss/spor",                   "Hürriyet"),
    ("https://www.hurriyet.com.tr/rss/teknoloji",              "Hürriyet"),
    # Milliyet
    ("https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml",   "Milliyet"),
    ("https://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml",  "Milliyet"),
    ("https://www.milliyet.com.tr/rss/rssNew/sporRss.xml",     "Milliyet"),
    # Sabah
    ("https://www.sabah.com.tr/rss/gundem.xml",                "Sabah"),
    ("https://www.sabah.com.tr/rss/ekonomi.xml",               "Sabah"),
    ("https://www.sabah.com.tr/rss/spor.xml",                  "Sabah"),
    ("https://www.sabah.com.tr/rss/teknoloji.xml",             "Sabah"),
    ("https://www.sabah.com.tr/rss/galatasaray.xml",           "Sabah"),
    ("https://www.sabah.com.tr/rss/fenerbahce.xml",            "Sabah"),
    ("https://www.sabah.com.tr/rss/besiktas.xml",              "Sabah"),
    # HaberTürk
    ("https://www.haberturk.com/rss/gundem.xml",               "Haberturk"),
    ("https://www.haberturk.com/rss/ekonomi.xml",              "Haberturk"),
    ("https://www.haberturk.com/rss/spor.xml",                 "Haberturk"),
    # Cumhuriyet
    ("https://www.cumhuriyet.com.tr/rss/son_dakika.xml",       "Cumhuriyet"),
    ("https://www.cumhuriyet.com.tr/rss/ekonomi.xml",          "Cumhuriyet"),
    # Sözcü
    ("https://www.sozcu.com.tr/rss/gundem.xml",                "Sözcü"),
    ("https://www.sozcu.com.tr/rss/ekonomi.xml",               "Sözcü"),
    ("https://www.sozcu.com.tr/rss/spor.xml",                  "Sözcü"),
    # Yeni Şafak
    ("https://www.yenisafak.com/rss.xml",                      "Yeni Şafak"),
    # A Haber
    ("https://www.ahaber.com.tr/rss/gundem.xml",               "A Haber"),
    ("https://www.ahaber.com.tr/rss/ekonomi.xml",              "A Haber"),
    ("https://www.ahaber.com.tr/rss/spor.xml",                 "A Haber"),
    # DW Türkçe
    ("https://rss.dw.com/rdf/rss-tur-all",                     "DW Türkçe"),
    # Ensonhaber
    ("https://www.ensonhaber.com/rss/ensonhaber.xml",          "Ensonhaber"),
    # Gazete Duvar
    ("https://www.gazeteduvar.com.tr/feed",                    "Gazete Duvar"),
    # Dünya
    ("https://www.dunya.com/rss/gundem.xml",                   "Dünya"),
    ("https://www.dunya.com/rss/ekonomi.xml",                  "Dünya"),
    # Mynet
    ("https://www.mynet.com/haber/rss/gundem",                 "Mynet"),
    ("https://www.mynet.com/haber/rss/ekonomi",                "Mynet"),
    ("https://www.mynet.com/haber/rss/spor",                   "Mynet"),
    # Sputnik Türkiye
    ("https://tr.sputniknews.com/export/rss2/archive/index.xml", "Sputnik"),
    # Takvim
    ("https://www.takvim.com.tr/rss/gundem.xml",               "Takvim"),
    ("https://www.takvim.com.tr/rss/spor.xml",                 "Takvim"),
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
    media_content = getattr(entry, "media_content", None)
    if media_content and isinstance(media_content, list):
        for mc in media_content:
            url = mc.get("url") or mc.get("href")
            if url:
                return url
    media_thumbnail = getattr(entry, "media_thumbnail", None)
    if media_thumbnail and isinstance(media_thumbnail, list):
        url = media_thumbnail[0].get("url") or media_thumbnail[0].get("href")
        if url:
            return url
    enclosures = getattr(entry, "enclosures", None)
    if enclosures:
        for enc in enclosures:
            if "image" in enc.get("type", ""):
                return enc.get("href") or enc.get("url")
    return None


# ── Yardımcı: cosine similarity ile dedup kontrol ────────────────────────────
async def _find_duplicate(db: AsyncSession, embedding: list) -> NewsArticle | None:
    """
    pgvector cosine distance ile en yakın news_article'ı bul.
    Distance < settings.RSS_DEDUP_THRESHOLD ise duplicate sayılır.
    """
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = sqlalchemy.text(
        """
        SELECT id, source_count, embedding <=> :emb AS dist
        FROM news_articles
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :emb
        LIMIT 1
        """
    )
    result = await db.execute(sql, {"emb": embedding_str})
    row = result.fetchone()
    if row and row.dist < settings.RSS_DEDUP_THRESHOLD:
        return await db.get(NewsArticle, row.id)
    return None


# ── Ana ingest fonksiyonu (async) ─────────────────────────────────────────────
async def _run_ingest():
    async with AsyncSessionLocal() as db:
        total_new = 0
        total_dup = 0

        for rss_url, source_name in RSS_SOURCES:
            source_new = 0
            source_dup = 0
            try:
                feed = feedparser.parse(rss_url)
                entries = feed.entries[: settings.RSS_INGEST_BATCH]
            except Exception as exc:
                logger.warning("rss.fetch_error url=%s err=%s", rss_url, exc)
                continue

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
                image_url  = _extract_image(entry)

                pub_date = None
                published_parsed = getattr(entry, "published_parsed", None)
                if published_parsed:
                    try:
                        pub_date = datetime(*published_parsed[:6], tzinfo=timezone.utc)
                    except Exception:
                        pass

                try:
                    embedding = vectorizer.get_embedding(title + " " + content[:500])
                except Exception as exc:
                    logger.warning("rss.embed_error title=%s err=%s", title[:60], exc)
                    continue

                duplicate = await _find_duplicate(db, embedding)
                if duplicate:
                    duplicate.source_count = duplicate.source_count + 1
                    await db.commit()
                    source_dup += 1
                    total_dup  += 1
                    continue

                article_id = uuid_module.uuid4()
                article = NewsArticle(
                    id           = article_id,
                    title        = title,
                    content      = content,
                    embedding    = embedding,
                    category     = category,
                    subcategory  = subcategory,
                    image_url    = image_url,
                    source_name  = source_name,
                    source_url   = source_url,
                    trust_score  = trust_score,
                    pub_date     = pub_date,
                    cluster_id   = article_id,
                    source_count = 1,
                    label        = None,
                    label_source = None,
                )
                db.add(article)
                source_new += 1
                total_new  += 1

            await db.commit()
            logger.info(
                "rss.source_done source=%s new=%d dup=%d",
                source_name, source_new, source_dup,
            )

        logger.info("rss.ingest_complete total_new=%d total_dup=%d", total_new, total_dup)


# ── Celery task ───────────────────────────────────────────────────────────────
@celery_app.task(name="workers.rss_ingester.ingest_rss_feeds", queue=settings.RSS_INGEST_QUEUE)
def ingest_rss_feeds():
    logger.info("rss.task_start")
    asyncio.run(_run_ingest())
    logger.info("rss.task_done")
