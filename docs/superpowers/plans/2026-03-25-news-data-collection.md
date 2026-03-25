# News Data Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Güvenilir Türk haber kaynaklarından RSS ve sitemap scraping ile ~6000 yeni `Doğru` etiketli kayıt toplayarak eğitim setini ~10.000'e çıkarmak, ardından Celery beat ile günlük otomatik beslemeyi aktive etmek.

**Architecture:** İki bağımsız bulk script (`scrape_rss_bulk.py`, `scrape_sitemap_bulk.py`) mevcut `NewsCleaner + TurkishVectorizer` pipeline'ını kullanarak `Article(status="Doğru")` yazar. Üçüncü adımda bu mantık `workers/agent_tasks.py` beat schedule'ına görev olarak eklenir. Tüm scriptler mevcut `ingest_aa_data.py` pattern'ını izler.

**Tech Stack:** Python, feedparser, requests, BeautifulSoup4, SQLAlchemy async, PostgreSQL pgvector, Celery

---

## Dosya Haritası

| Durum | Dosya | Sorumluluk |
|-------|-------|------------|
| Yeni | `scripts/__init__.py` | `scripts/` paket olarak importlanabilsin |
| Yeni | `scripts/scrape_rss_bulk.py` | RSS feed'lerinden bulk Doğru veri ingest |
| Yeni | `scripts/scrape_sitemap_bulk.py` | Sitemap'ten geçmiş haber bulk ingest |
| Değiştirilecek | `workers/agent_tasks.py` | `ingest_trusted_rss` beat görevi ekleme |

Dokunulmayacak: `ml_engine/`, `workers/tasks.py`, `app/models/`, `scrapers/rss_monitor.py`

---

## Task 1: scrape_rss_bulk.py

**Files:**
- Create: `scripts/scrape_rss_bulk.py`

- [ ] **Step 1: Dosyayı oluştur**

```python
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
                    logger.info("%d kayıt commit edildi...", batch_count)

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
```

- [ ] **Step 2: Dry-run ile doğrula**

```bash
docker-compose exec app python scripts/scrape_rss_bulk.py --dry-run
```

Beklenen çıktı: Her kaynak için `[DRY-RUN] TRT Haber | ...` satırları. Hata yoksa devam et.

Eğer bir kaynak 0 entry dönüyorsa RSS URL'si geçersiz demektir — `SOURCES` listesindeki ilgili URL'yi tarayıcıda kontrol edip güncelle.

- [ ] **Step 3: Gerçek ingest çalıştır**

```bash
docker-compose exec app python scripts/scrape_rss_bulk.py
```

Beklenen çıktı: `Tamamlandı. Toplam eklenen: <N>` (N genellikle 50-200 arası)

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape_rss_bulk.py
git commit -m "feat(data): RSS bulk ingest script eklendi (TRT, BBC Türkçe, Euronews, Milliyet, Sabah)"
```

---

## Task 2: scrape_sitemap_bulk.py

**Files:**
- Create: `scripts/scrape_sitemap_bulk.py`

- [ ] **Step 1: Dosyayı oluştur**

```python
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

# Site başına sitemap + içerik çekme konfigürasyonu.
# content_selectors: BeautifulSoup için CSS seçiciler (öncelik sırası).
# Hiçbiri çalışmazsa <article> ve <p> fallback'i devreye girer.
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

    # Sitemap index mi yoksa urlset mi?
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
            # Alt sitemap'i recursive olarak parse et
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

    # İstenmeyen elementleri kaldır
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    for selector in selectors:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(separator=" ", strip=True)
            if len(text) >= MIN_CONTENT_LEN:
                return text

    # Fallback: tüm paragraflar
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
            batch_count = 0
            for i, url in enumerate(urls):
                logger.info("[%d/%d] %s", i + 1, len(urls), url[:80])

                if not dry_run:
                    # Title henüz bilinmiyor, link duplicate kontrolü yeterli
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

                # Başlık
                soup = BeautifulSoup(resp.text, "html.parser")
                title_tag = soup.find("h1") or soup.find("title")
                raw_title = title_tag.get_text(strip=True) if title_tag else url.split("/")[-1]

                # İçerik
                raw_body = _extract_article_text(resp.text, cfg["content_selectors"])
                if not raw_body:
                    raw_body = raw_title  # fallback

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

                # Title duplicate kontrolü (artık title biliyoruz)
                if not dry_run:
                    if await is_duplicate(session, url, raw_title):
                        logger.debug("Title duplicate atlandı: %s", raw_title[:60])
                        continue

                truncated_title = raw_title[:TITLE_MAX_LEN] + (
                    "..." if len(raw_title) > TITLE_MAX_LEN else ""
                )

                if dry_run:
                    logger.info("[DRY-RUN] %s | %s", source_name, truncated_title)
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
                batch_count += 1

                if batch_count % COMMIT_BATCH == 0:
                    await session.commit()
                    logger.info("%d kayıt commit edildi...", batch_count)

            if not dry_run:
                await session.commit()

        logger.info("%s tamamlandı. Bu kaynaktan eklenen: %d", source_name, batch_count)

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
```

- [ ] **Step 2: Tek kaynakla dry-run test et**

```bash
docker-compose exec app python scripts/scrape_sitemap_bulk.py --source "TRT Haber" --dry-run
```

Beklenen çıktı: `[DRY-RUN] TRT Haber | ...` satırları. URL sayısı 0 dönüyorsa sitemap URL'si geçersiz — `SITEMAP_SOURCES["TRT Haber"]["sitemap_url"]`'yi tarayıcıda kontrol et.

- [ ] **Step 3: Tek kaynakla gerçek ingest (küçük test)**

```bash
docker-compose exec app python scripts/scrape_sitemap_bulk.py --source "TRT Haber" --months 1
```

Birkaç yüz kayıt eklenirse diğer kaynaklara geç.

- [ ] **Step 4: Tüm kaynakları çalıştır**

```bash
docker-compose exec app python scripts/scrape_sitemap_bulk.py --months 6
```

Bu işlem uzun sürebilir (sitemap boyutuna göre 30dk–2 saat). Logları izle.

- [ ] **Step 5: Kayıt sayısını doğrula**

```bash
docker-compose exec app python -c "
import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as s:
        r = await s.execute(text(\"SELECT status, COUNT(*) FROM articles GROUP BY status ORDER BY count DESC\"))
        for row in r: print(row)

asyncio.run(check())
"
```

Doğru sayısının arttığını doğrula.

- [ ] **Step 6: Commit**

```bash
git add scripts/scrape_sitemap_bulk.py
git commit -m "feat(data): sitemap bulk ingest script eklendi (TRT, Milliyet, Sabah, NTV)"
```

---

## Task 3: Celery Beat Görevi (workers/agent_tasks.py)

**Files:**
- Create: `scripts/__init__.py` (boş dosya — `scripts/` paketini importlanabilir yapar)
- Modify: `workers/agent_tasks.py`

- [ ] **Step 1: `scripts/__init__.py` oluştur**

```bash
touch scripts/__init__.py
```

Bu adım olmadan `from scripts.scrape_rss_bulk import ingest_rss_sources` Celery worker'da `ModuleNotFoundError` verir.

- [ ] **Step 2: `ingest_trusted_rss` görevini ekle**

`workers/agent_tasks.py` dosyasına şunları ekle:

1. Import satırına ekle (dosyanın başında, diğer import'lardan sonra):
```python
from scripts.scrape_rss_bulk import ingest_rss_sources
from scrapers.rss_monitor import get_vectorizer
```

2. `beat_schedule` dict'ine ikinci entry ekle:
```python
celery_app.conf.beat_schedule = {
    "scan-turkish-news-every-60s": {
        "task": "workers.agent_tasks.run_news_scan",
        "schedule": settings.NEWS_AGENT_INTERVAL,
    },
    "ingest-trusted-rss-daily": {                          # YENİ
        "task": "workers.agent_tasks.ingest_trusted_rss",
        "schedule": 86400,  # 24 saat (saniye cinsinden)
    },
}
```

3. Yeni Celery task fonksiyonunu `run_news_scan`'ın altına ekle:
```python
@celery_app.task(name="workers.agent_tasks.ingest_trusted_rss", bind=True, max_retries=2)
def ingest_trusted_rss(self):
    """
    Her 24 saatte bir tetiklenir.
    Güvenilir RSS feed'lerinden yeni haberleri Doğru etiketiyle ingest eder.
    get_vectorizer() singleton kullanılır — OOM riskini azaltır.
    Dedup kontrolü sayesinde idempotent çalışır.
    """
    logger.info("▶ Güvenilir RSS ingest başlatılıyor...")
    try:
        # Singleton vectorizer'ı inject et — run_news_scan ile paylaşılır
        vect = get_vectorizer()
        count = asyncio.run(ingest_rss_sources(dry_run=False, vectorizer=vect))
        logger.info("✔ RSS ingest tamamlandı. Eklenen: %d", count)
        return {"added": count}
    except Exception as exc:
        logger.exception("RSS ingest başarısız: %s", exc)
        raise self.retry(exc=exc, countdown=300)  # 5dk sonra tekrar dene
```

- [ ] **Step 3: Import hatası yoksa doğrula**

```bash
docker-compose exec app python -c "from workers.agent_tasks import ingest_trusted_rss; print('OK')"
```

Beklenen: `OK`

- [ ] **Step 4: Manuel tetikle ve logları izle**

```bash
docker-compose exec worker celery -A workers.agent_tasks call workers.agent_tasks.ingest_trusted_rss
```

`worker` container loglarını izle:
```bash
docker-compose logs -f worker
```

- [ ] **Step 5: Commit**

```bash
git add scripts/__init__.py workers/agent_tasks.py
git commit -m "feat(celery): günlük güvenilir RSS ingest beat görevi eklendi"
```

---

## Task 4: Yeniden Eğitim

- [ ] **Step 1: Sınıf dengesini kontrol et**

```bash
docker-compose exec app python -c "
import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as s:
        r = await s.execute(text(\"\"\"
            SELECT
                CASE
                    WHEN status IN ('Doğru','DOĞRU','doğru','AUTHENTIC','authentic','TRUE','true') THEN 'Authentic'
                    WHEN status IN ('Yanlış','YANLIŞ','yanlış','FAKE','fake','FALSE','false') THEN 'Fake'
                    ELSE 'Other'
                END as label,
                COUNT(*)
            FROM articles
            GROUP BY label
        \"\"\"))
        for row in r: print(row)

asyncio.run(check())
"
```

Oran 3:1'i (Authentic:Fake) geçiyorsa `dogruluk-payi.com` verisi ile Fake tarafı dengelenebilir. 3:1 altındaysa direkt devam et.

- [ ] **Step 2: Model yedeği al**

```bash
docker-compose exec app cp ml_engine/models/fake_news_classifier.pkl ml_engine/models/fake_news_classifier.bak.pkl
```

- [ ] **Step 3: Modeli yeniden eğit**

```bash
docker-compose exec app python scripts/train_classifier.py
```

Beklenen çıktı: Accuracy %84+, F1 her iki sınıf için 0.82+

- [ ] **Step 4: Sonuçları kaydet ve commit et**

```bash
git add ml_engine/models/fake_news_classifier.pkl
git commit -m "ml: veri genişletme sonrası model yeniden eğitildi"
```

---

## Notlar

**RSS URL'leri güncellenebilir:** Her sitenin RSS URL'si değişebilir. `--dry-run` ile 0 entry dönüyorsa tarayıcıda `<site>/rss` veya `<site>/feed` adreslerini dene.

**Sitemap erişim engeli:** Bazı siteler bot trafiğini engelleyebilir. Bu durumda `HEADERS` içindeki User-Agent güncellenir veya ilgili kaynak `SITEMAP_SOURCES`'dan çıkarılır.

**OOM riski:** Sitemap ingest sırasında `TurkishVectorizer()` her çalıştırmada yüklenir. Docker memory limiti aşılırsa `--months 2` ile daha küçük batch'ler çalıştır.
