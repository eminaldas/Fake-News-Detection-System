"""
scripts/scrape_rss_bulk.py
==========================
Güvenilir Türk haber ajanslarının RSS feed'lerinden makale toplar,
NewsCleaner + TurkishVectorizer pipeline'ından geçirir ve
status="Doğru" olarak PostgreSQL'e yazar.

Kullanım:
  docker-compose exec app python scripts/scrape_rss_bulk.py --dry-run
  docker-compose exec app python scripts/scrape_rss_bulk.py
"""

import asyncio
import argparse
import logging
import os
import sys

import feedparser
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.models import Article
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [RSSBulk] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RSSBulk")

TITLE_MAX_LEN = 75
MIN_CONTENT_LEN = 50
EMBED_MAX_CHARS = 1500
COMMIT_BATCH = 50

# Güvenilir Türk haber kaynakları
# Not: URL'leri tarayıcıdan doğrula, değiştiyse güncelle.
SOURCES = [
    {"name": "TRT Haber",       "rss": "https://www.trthaber.com/sondakika.rss"},
    {"name": "BBC Türkçe",      "rss": "https://feeds.bbci.co.uk/turkish/rss.xml"},
    {"name": "Euronews Türkçe", "rss": "https://tr.euronews.com/rss"},
    {"name": "Milliyet",        "rss": "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml"},
    {"name": "Sabah",           "rss": "https://www.sabah.com.tr/rss/anasayfa.xml"},
]


async def is_duplicate(session, url: str, title: str) -> bool:
    """Link veya başlık bazlı çift duplicate kontrolü."""
    link_res = await session.execute(
        select(Article).where(
            Article.metadata_info["link"].astext == url
        ).limit(1)
    )
    if link_res.scalars().first() is not None:
        return True
    truncated = title[:TITLE_MAX_LEN] + ("..." if len(title) > TITLE_MAX_LEN else "")
    title_res = await session.execute(
        select(Article).where(Article.title == truncated).limit(1)
    )
    return title_res.scalars().first() is not None


async def ingest_rss_sources(
    dry_run: bool = False,
    vectorizer=None,  # Celery context'inden get_vectorizer() singleton enjekte edilebilir
) -> int:
    cleaner = NewsCleaner()
    if vectorizer is None:
        vectorizer = TurkishVectorizer()
    total_added = 0

    async with AsyncSessionLocal() as session:
        batch_count = 0
        for source in SOURCES:
            logger.info("RSS okunuyor: %s", source["name"])
            try:
                feed = feedparser.parse(source["rss"])
            except Exception as exc:
                logger.warning("Feed parse hatası (%s): %s", source["name"], exc)
                continue

            for entry in feed.entries:
                url = entry.get("link", "").strip()
                raw_title = entry.get("title", "").strip()
                if not url or not raw_title:
                    continue

                if not dry_run:
                    if await is_duplicate(session, url, raw_title):
                        logger.debug("Duplicate atlandı: %s", raw_title[:60])
                        continue

                raw_body = (
                    entry.get("summary", "")
                    or entry.get("description", "")
                    or ""
                )
                processed = cleaner.process(
                    raw_iddia=raw_title + " " + raw_body,
                    detayli_analiz_raw=None,
                )
                cleaned_text = processed["cleaned_text"]
                if (
                    cleaned_text == "Bilgi mevcut değil"
                    or len(cleaned_text.strip()) < MIN_CONTENT_LEN
                ):
                    continue

                truncated_title = raw_title[:TITLE_MAX_LEN] + (
                    "..." if len(raw_title) > TITLE_MAX_LEN else ""
                )

                if dry_run:
                    logger.info("[DRY-RUN] %s | %s", source["name"], truncated_title)
                    total_added += 1
                    continue

                embedding = vectorizer.get_embedding(cleaned_text[:EMBED_MAX_CHARS])

                article = Article(
                    title=truncated_title,
                    raw_content=processed["original_text"],
                    content=cleaned_text,
                    embedding=embedding,
                    status="Doğru",
                    metadata_info={
                        "link": url,
                        "baslik": raw_title,
                        "source": source["name"],
                        "tarih": entry.get("published", ""),
                        "hata_turu": "Yok (Güvenilir Kaynak)",
                        "dayanak_noktalari": source["name"],
                        "detayli_analiz": processed["cleaned_detayli_analiz"],
                        "etiketler": "",
                        "linguistic_signals": processed["signals"],
                    },
                )
                session.add(article)
                total_added += 1
                batch_count += 1

                if batch_count % COMMIT_BATCH == 0:
                    await session.commit()
                    logger.info("%d kayıt commit edildi.", batch_count)

        if not dry_run:
            await session.commit()

    logger.info("Tamamlandı. Toplam eklenen: %d", total_added)
    return total_added


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RSS Bulk Ingest")
    parser.add_argument(
        "--dry-run", action="store_true", help="DB'ye yazmadan test et"
    )
    args = parser.parse_args()
    asyncio.run(ingest_rss_sources(dry_run=args.dry_run))
