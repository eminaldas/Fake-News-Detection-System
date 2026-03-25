"""
scripts/scrape_sitemap_bulk.py
==============================
Güvenilir Türk haber sitelerinin sitemap.xml'lerinden geçmiş makaleleri toplar.
Her URL için article body'si BeautifulSoup ile çekilir, pipeline'dan geçirilir,
status="Doğru" olarak DB'ye yazılır.

Kullanım:
  docker-compose exec app python scripts/scrape_sitemap_bulk.py --dry-run
  docker-compose exec app python scripts/scrape_sitemap_bulk.py --months 6
  docker-compose exec app python scripts/scrape_sitemap_bulk.py --source "TRT Haber"
"""

import asyncio
import argparse
import logging
import os
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests
from bs4 import BeautifulSoup
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.models import Article
from ml_engine.processing.cleaner import NewsCleaner
from ml_engine.vectorizer import TurkishVectorizer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SitemapBulk] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("SitemapBulk")

TITLE_MAX_LEN = 75
MIN_CONTENT_LEN = 50
EMBED_MAX_CHARS = 1500
COMMIT_BATCH = 50
REQUEST_DELAY = 1.0   # saniye — per-domain rate limit
MAX_RETRIES = 3
REQUEST_TIMEOUT = 10  # saniye

SITEMAP_SOURCES = {
    "TRT Haber": {
        "sitemap_url": "https://www.trthaber.com/sitemap.xml",
        "content_selectors": ["div.article-content-text", "div.news-text", "article"],
        "url_filter": "trthaber.com/haber/",
        "domain": "trthaber.com",
    },
    "Milliyet": {
        "sitemap_url": "https://www.milliyet.com.tr/sitemap.xml",
        "content_selectors": ["div.article-body", "div.news-detail-content", "article"],
        "url_filter": "milliyet.com.tr/",
        "domain": "milliyet.com.tr",
    },
    "Sabah": {
        "sitemap_url": "https://www.sabah.com.tr/sitemap.xml",
        "content_selectors": ["div.news-detail-text", "div.article-content", "article"],
        "url_filter": "sabah.com.tr/",
        "domain": "sabah.com.tr",
    },
    "NTV": {
        "sitemap_url": "https://www.ntv.com.tr/sitemap.xml",
        "content_selectors": ["div.article-body", "div.content-text", "article"],
        "url_filter": "ntv.com.tr/",
        "domain": "ntv.com.tr",
    },
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; FakeNewsDetector/1.0; "
        "+https://github.com/fake-news-detection-system)"
    )
}

_domain_last_request: dict[str, float] = {}


def _rate_limit(domain: str) -> None:
    """Domain başına minimum REQUEST_DELAY bekler."""
    last = _domain_last_request.get(domain, 0.0)
    wait = REQUEST_DELAY - (time.time() - last)
    if wait > 0:
        time.sleep(wait)
    _domain_last_request[domain] = time.time()


def _fetch(url: str, domain: str) -> Optional[requests.Response]:
    """Rate limiting + exponential backoff ile GET isteği."""
    _rate_limit(domain)
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 429:
                wait = 2 ** attempt * 5
                logger.warning("429 alındı (%s), %ds bekleniyor...", domain, wait)
                time.sleep(wait)
                continue
            logger.debug("HTTP %d: %s", resp.status_code, url)
            return None
        except requests.RequestException as exc:
            logger.warning("İstek hatası (deneme %d/%d): %s", attempt + 1, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
    return None


def _parse_sitemap_urls(
    sitemap_url: str,
    domain: str,
    url_filter: str,
    cutoff: datetime,
) -> list[str]:
    """
    Sitemap XML'den URL listesi çıkarır.
    Sitemap index (sitemapindex) ve normal sitemap (urlset) desteklenir.
    """
    resp = _fetch(sitemap_url, domain)
    if not resp:
        logger.warning("Sitemap çekilemedi: %s", sitemap_url)
        return []

    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError as exc:
        logger.warning("Sitemap XML parse hatası (%s): %s", sitemap_url, exc)
        return []

    # XML namespace'i temizle
    ns = root.tag.split("}")[0].strip("{") if "}" in root.tag else ""
    tag = lambda name: f"{{{ns}}}{name}" if ns else name

    urls: list[str] = []

    if root.tag == tag("sitemapindex"):
        for sitemap_el in root.findall(tag("sitemap")):
            loc_el = sitemap_el.find(tag("loc"))
            if loc_el is None or not loc_el.text:
                continue
            lastmod_el = sitemap_el.find(tag("lastmod"))
            if lastmod_el is not None and lastmod_el.text:
                try:
                    lastmod = datetime.fromisoformat(
                        lastmod_el.text[:10]
                    ).replace(tzinfo=timezone.utc)
                    if lastmod < cutoff:
                        continue
                except ValueError:
                    pass
            sub_urls = _parse_sitemap_urls(
                loc_el.text.strip(), domain, url_filter, cutoff
            )
            urls.extend(sub_urls)
    else:
        for url_el in root.findall(tag("url")):
            loc_el = url_el.find(tag("loc"))
            if loc_el is None or not loc_el.text:
                continue
            url = loc_el.text.strip()
            if url_filter and url_filter not in url:
                continue
            lastmod_el = url_el.find(tag("lastmod"))
            if lastmod_el is not None and lastmod_el.text:
                try:
                    lastmod = datetime.fromisoformat(
                        lastmod_el.text[:10]
                    ).replace(tzinfo=timezone.utc)
                    if lastmod < cutoff:
                        continue
                except ValueError:
                    pass
            urls.append(url)

    logger.info("Sitemap'ten %d URL alındı: %s", len(urls), sitemap_url)
    return urls


def _extract_article_text(html: str, selectors: list[str]) -> str:
    """
    BeautifulSoup ile makale metnini çıkarır.
    Selectors listesini öncelik sırasıyla dener, çalışan ilkini kullanır.
    Hiçbiri çalışmazsa tüm <p> tag'lerinden metin toplar.
    """
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    for selector in selectors:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(separator=" ", strip=True)
            if len(text) >= MIN_CONTENT_LEN:
                return text

    paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True)]
    return " ".join(paragraphs)


async def is_duplicate(session, url: str, title: str) -> bool:
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


async def ingest_sitemap_sources(
    months: int = 6,
    dry_run: bool = False,
    only_source: Optional[str] = None,
) -> int:
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=months * 30)
    cleaner = NewsCleaner()
    vectorizer = TurkishVectorizer()
    total_added = 0

    sources = (
        {only_source: SITEMAP_SOURCES[only_source]}
        if only_source and only_source in SITEMAP_SOURCES
        else SITEMAP_SOURCES
    )

    for source_name, cfg in sources.items():
        logger.info("=== %s sitemap işleniyor ===", source_name)
        urls = _parse_sitemap_urls(
            cfg["sitemap_url"], cfg["domain"], cfg["url_filter"], cutoff
        )
        logger.info("%d URL bulundu (son %d ay).", len(urls), months)

        async with AsyncSessionLocal() as session:
            source_added = 0
            for i, url in enumerate(urls):
                logger.info("[%d/%d] %s", i + 1, len(urls), url[:80])

                if not dry_run:
                    link_res = await session.execute(
                        select(Article).where(
                            Article.metadata_info["link"].astext == url
                        ).limit(1)
                    )
                    if link_res.scalars().first() is not None:
                        logger.debug("Duplicate atlandı: %s", url[:60])
                        continue

                resp = _fetch(url, cfg["domain"])
                if not resp:
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                title_tag = soup.find("h1") or soup.find("title")
                raw_title = title_tag.get_text(strip=True) if title_tag else url.split("/")[-1]

                raw_body = _extract_article_text(resp.text, cfg["content_selectors"])
                if not raw_body:
                    raw_body = raw_title

                processed = cleaner.process(
                    raw_iddia=raw_title + " " + raw_body,
                    detayli_analiz_raw=None,
                )
                cleaned_text = processed["cleaned_text"]
                if (
                    cleaned_text == "Bilgi mevcut değil"
                    or len(cleaned_text.strip()) < MIN_CONTENT_LEN
                ):
                    logger.debug("İçerik yetersiz, atlandı: %s", url[:60])
                    continue

                truncated_check = raw_title[:TITLE_MAX_LEN] + ("..." if len(raw_title) > TITLE_MAX_LEN else "")
                title_res = await session.execute(
                    select(Article).where(Article.title == truncated_check).limit(1)
                )
                if title_res.scalars().first() is not None:
                    logger.debug("Title duplicate atlandı: %s", raw_title[:60])
                    continue

                truncated_title = raw_title[:TITLE_MAX_LEN] + (
                    "..." if len(raw_title) > TITLE_MAX_LEN else ""
                )

                if dry_run:
                    logger.info("[DRY-RUN] %s | %s", source_name, truncated_title)
                    total_added += 1
                    source_added += 1
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
                        "source": source_name,
                        "tarih": "",
                        "hata_turu": "Yok (Güvenilir Kaynak)",
                        "dayanak_noktalari": source_name,
                        "detayli_analiz": processed["cleaned_detayli_analiz"],
                        "etiketler": "",
                        "linguistic_signals": processed["signals"],
                    },
                )
                session.add(article)
                total_added += 1
                source_added += 1

                if source_added % COMMIT_BATCH == 0:
                    await session.commit()
                    logger.info("Toplam %d kayıt commit edildi.", total_added)

            if not dry_run:
                await session.commit()

        logger.info("%s tamamlandı. Bu kaynaktan eklenen: %d", source_name, source_added)

    logger.info("=== Genel toplam eklenen: %d ===", total_added)
    return total_added


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sitemap Bulk Ingest")
    parser.add_argument(
        "--months", type=int, default=6, help="Kaç aylık geçmiş (default: 6)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="DB'ye yazmadan test et"
    )
    parser.add_argument(
        "--source", type=str, default=None,
        help=f"Yalnızca belirli kaynak: {list(SITEMAP_SOURCES.keys())}"
    )
    args = parser.parse_args()
    asyncio.run(
        ingest_sitemap_sources(
            months=args.months,
            dry_run=args.dry_run,
            only_source=args.source,
        )
    )
