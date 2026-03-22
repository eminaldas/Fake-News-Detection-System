"""
scrapers/rss_monitor.py
========================
Türkiye Gündem Agent — RSS Monitor & NLP Tabanlı Sınıflandırıcı

Pipeline:
  1. Google News RSS → başlık + kaynak domain + URL (son 24 saat)
  2. DB title-duplicate kontrolü
  3. NewsCleaner NLP sinyalleri (ünlem, büyük harf, soru yoğunluğu)
  4. TurkishVectorizer BERT embedding → pgvector benzerlik kontrolü
  5. Skor tabanlı sınıflandırma:
       keyword kökleri + NLP sinyalleri + kaynak güvenilirliği + pgvector
  6. Article + AnalysisResult + embedding DB kaydı

Kullanım:
  python -m scrapers.rss_monitor             # Tek seferlik tarama
  python -m scrapers.rss_monitor --dry-run   # DB'ye yazmadan test
"""

import os
import re
import json
import asyncio
import logging
import argparse
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlparse
from email.utils import parsedate_to_datetime

import feedparser
import requests
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.models import Article, AnalysisResult
from ml_engine.processing.cleaner import NewsCleaner

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [NewsAgent] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("NewsAgent")


def _safe_log(text: str, max_len: int = 80) -> str:
    return re.sub(r"[\r\n\t]", " ", str(text))[:max_len]


# ─────────────────────────────────────────────────────────────────────────────
# Sabitler
# ─────────────────────────────────────────────────────────────────────────────
TITLE_MAX_LEN        = 500
URL_MAX_LEN          = 500
MAX_HEADLINES        = 5
FETCH_TIMEOUT        = 6
SNIPPET_MAX_CHARS    = 600
SIMILARITY_THRESHOLD = 0.25

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9",
}

_cleaner = NewsCleaner()

# ─────────────────────────────────────────────────────────────────────────────
# Güvenilir Kaynak Domainleri
# ─────────────────────────────────────────────────────────────────────────────
_TRUSTED_DOMAINS = {
    "aa.com.tr", "trt.net.tr", "trtworld.com",
    "bloomberght.com", "bbc.com", "reuters.com",
    "cumhurbaşkanlığı", "ntv.com.tr", "cnnturk.com",
    "haberturk.com", "milliyet.com.tr", "hurriyet.com.tr",
    "sabah.com.tr", "sozcu.com.tr", "t24.com.tr",
    "bianet.org", "gazeteduvar.com.tr", "cumhuriyet.com.tr",
}

# ─────────────────────────────────────────────────────────────────────────────
# Keyword Kökleri — Türkçe Morfologiye Uygun Alt-Dizi Eşleşmesi
# ─────────────────────────────────────────────────────────────────────────────

# Gerçek/doğrulanmış → dogru sinyali
_FACTUAL_ROOTS = [
    "açıkla", "duyur", "doğrulan", "kesinleş", "onaylan",
    "imzalan", "yürürlüğe", "kabul ed", "karar veril",
    "tescil", "resmen", "devreye gir", "başlatıldı",
    "tamamland", "hayata geçir", "ilan ed", "yayımland",
    "göreve başla", "istifa et", "seçildi", "atandı",
]

# İddia/söylenti → belirsiz sinyali
_CLAIM_ROOTS = [
    "iddia", "söylent", "sızınt", "öne sürd", "ileri sürd",
    "duyumlar", "kulislerde", "kaynağa göre",
    "edinilen bilgilere", "iddianame",
]

# Sadece gerçek clickbait/tabloid dili → yalan sinyali
# NOT: çöktü/battı/yıkıldı ÇIKARILDI — fiziksel olayları anlatır
_MANIPULATIVE_ROOTS = [
    "inanamayacak", "şok edici", "bomba gibi", "patlak verd",
    "rezalet", "skandal patlad", "dehşete düşürdü",
]

# Resmî kurum adı başlıkta geçiyorsa güvenilirlik sinyali
# Kısaltmalar dahil edildi (MSB, MEB, TBMM, İBB vb.)
_AUTHORITY_ROOTS = [
    "msb:", "msb ", "meb:", "meb ", "tbmm", "ibb:",
    "bakanlık", "bakan ", "başbakan", "cumhurbaşkan",
    "tc ", "türk silahlı", "emniyet", "jandarma",
    "sağlık bakanlığı", "içişleri", "dışişleri",
    "hazine", "merkez bankası", "tüik", "afad",
    "diyanet", "yargıtay", "anayasa mahkemesi",
]


# ─────────────────────────────────────────────────────────────────────────────
# Yardımcılar
# ─────────────────────────────────────────────────────────────────────────────
def _validate_url(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return None
        return url[:URL_MAX_LEN]
    except Exception:
        return None


def _extract_source(entry: dict) -> tuple[str, str]:
    """RSS entry'den kaynak adı ve domain bilgisini çıkarır."""
    source      = entry.get("source", {})
    source_name = source.get("title", "")
    source_href = source.get("href", "")
    try:
        domain = urlparse(source_href).netloc.lower().removeprefix("www.")
    except Exception:
        domain = ""
    return source_name, domain


def _parse_pub_date(entry) -> Optional[datetime]:
    try:
        raw = entry.get("published") or entry.get("updated") or ""
        if not raw:
            return None
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _hits(text: str, roots: list[str]) -> list[str]:
    lower = text.lower()
    return [r for r in roots if r in lower]


def fetch_snippet(source_href: str, title: str) -> str:
    """
    Kaynak sitenin ana sayfasından meta-description veya paragraf alır.
    Başarısız olursa boş döner.
    """
    if not source_href:
        return ""
    try:
        r = requests.get(source_href, timeout=FETCH_TIMEOUT, headers=_HEADERS)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")

        # Başlıkla eşleşen haber linkini bul
        title_lower = title.lower()[:40]
        for a_tag in soup.find_all("a", href=True):
            link_text = a_tag.get_text().lower().strip()
            if title_lower[:20] in link_text:
                parent = a_tag.find_parent(["article", "div", "li", "section"])
                if parent:
                    text = parent.get_text(" ", strip=True)
                    if len(text) > 80:
                        return text[:SNIPPET_MAX_CHARS]

        # Fallback: meta description
        meta = (
            soup.find("meta", attrs={"name": "description"}) or
            soup.find("meta", attrs={"property": "og:description"})
        )
        if meta and meta.get("content"):
            content = meta["content"].strip()
            if "google" not in content.lower():
                return content[:SNIPPET_MAX_CHARS]

    except Exception as exc:
        logger.debug("Snippet çekme başarısız (%s): %s", source_href, exc)
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Vektör Yükleyici — Lazy Singleton
# ─────────────────────────────────────────────────────────────────────────────
_vectorizer = None


def get_vectorizer():
    global _vectorizer
    if _vectorizer is None:
        try:
            from ml_engine.vectorizer import TurkishVectorizer
            _vectorizer = TurkishVectorizer()
            logger.info("TurkishVectorizer yüklendi.")
        except Exception as exc:
            logger.warning("TurkishVectorizer yüklenemedi, embedding atlanacak: %s", exc)
    return _vectorizer


# ─────────────────────────────────────────────────────────────────────────────
# Skor Tabanlı Sınıflandırıcı
# ─────────────────────────────────────────────────────────────────────────────
def classify(
    title:          str,
    snippet:        str          = "",
    source_domain:  str          = "",
    similar_status: Optional[str] = None,
) -> dict:
    """
    Skor mantığı (−1.0 → +1.0, pozitif = daha güvenilir):

      +0.30 × factual_hits        (max 3 hit)
      −0.25 × claim_hits          (max 3 hit)
      −0.45 × manip_hits          (max 2 hit)
      +0.20 × authority_hits      (max 2 hit)
      +0.20   güvenilir domain
      −0.20   exclamation_ratio > 0.02
      −0.15   uppercase_ratio   > 0.35
      ±0.25   pgvector benzer makale sinyali

    score > +0.20 → dogru   | conf = 0.55 + score × 0.40
    score < −0.20 → yalan   | conf = 0.55 + |score| × 0.40
    aksi          → belirsiz | conf = 0.40 + |score| × 0.20
    """
    full_text = (title + " " + snippet).strip()

    factual_hits  = _hits(full_text, _FACTUAL_ROOTS)   # başlık + snippet
    claim_hits    = _hits(full_text, _CLAIM_ROOTS)      # başlık + snippet
    manip_hits    = _hits(title,     _MANIPULATIVE_ROOTS)  # yalnızca başlık
    auth_hits     = _hits(title,     _AUTHORITY_ROOTS)     # yalnızca başlık
    trusted_src   = source_domain in _TRUSTED_DOMAINS

    nlp = _cleaner.extract_manipulative_signals(title)

    score = 0.0
    score += 0.30 * min(len(factual_hits), 3)
    score -= 0.25 * min(len(claim_hits),   3)
    score -= 0.45 * min(len(manip_hits),   2)
    score += 0.20 * min(len(auth_hits),    2)
    if trusted_src:
        score += 0.20
    if nlp["exclamation_ratio"] > 0.02:
        score -= 0.20
    if nlp["uppercase_ratio"] > 0.35:
        score -= 0.15
    if similar_status == "dogru":
        score += 0.25
    elif similar_status == "yalan":
        score -= 0.25

    score = max(-1.0, min(1.0, score))

    if score > 0.20:
        status     = "dogru"
        confidence = round(min(0.55 + score * 0.40, 0.95), 2)
    elif score < -0.20:
        status     = "yalan"
        confidence = round(min(0.55 + abs(score) * 0.40, 0.95), 2)
    else:
        status     = "belirsiz"
        confidence = round(0.40 + abs(score) * 0.20, 2)

    classification_label = "iddia içeriği" if claim_hits else "gerçek veri"

    signals = {
        "factual_keywords":      factual_hits,
        "claim_keywords":        claim_hits,
        "manipulative_keywords": manip_hits,
        "authority_markers":     auth_hits,
        "trusted_source":        trusted_src,
        "exclamation_ratio":     nlp["exclamation_ratio"],
        "uppercase_ratio":       nlp["uppercase_ratio"],
        "question_density":      nlp["question_density"],
        "score":                 round(score, 3),
        "similar_article_used":  similar_status is not None,
    }

    logger.info(
        "Skor=%.3f → status=%s conf=%.2f | "
        "factual=%s claim=%s manip=%s auth=%s trusted=%s",
        score, status, confidence,
        factual_hits, claim_hits, manip_hits, auth_hits, trusted_src,
    )
    return {
        "classification_label": classification_label,
        "status":               status,
        "confidence":           confidence,
        "signals":              signals,
    }


# ─────────────────────────────────────────────────────────────────────────────
# RSS Monitor
# ─────────────────────────────────────────────────────────────────────────────
class RSSMonitor:
    RSS_URL = "https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr"

    def fetch_headlines(self) -> list[dict]:
        try:
            feed = feedparser.parse(self.RSS_URL)
        except Exception as exc:
            logger.error("RSS parse hatası: %s", exc)
            return []

        cutoff    = datetime.now(timezone.utc) - timedelta(hours=24)
        headlines = []
        for entry in feed.entries:
            # Ham başlıktan kaynak adını temizlemeden önce al
            raw_title = entry.get("title", "").strip()
            raw_url   = entry.get("link", "").strip()
            if not raw_title:
                continue

            pub_date = _parse_pub_date(entry)
            if pub_date and pub_date < cutoff:
                continue

            validated_url = _validate_url(raw_url)
            if not validated_url:
                continue

            source_name, source_domain = _extract_source(entry)
            # Kaynak adını başlıktan temizle
            clean_title = re.sub(
                rf"\s*-\s*{re.escape(source_name)}\s*$", "", raw_title
            ).strip() if source_name else re.sub(r"\s*-\s*[^-]+$", "", raw_title).strip()

            headlines.append({
                "title":         (clean_title or raw_title)[:TITLE_MAX_LEN],
                "url":           validated_url,
                "source_name":   source_name,
                "source_domain": source_domain,
                "source_href":   entry.get("source", {}).get("href", ""),
                "pub_date":      pub_date.isoformat() if pub_date else None,
            })

        logger.info("RSS'ten %d geçerli başlık çekildi (son 24 saat).", len(headlines))
        return headlines

    async def is_duplicate(self, session: AsyncSession, title: str) -> bool:
        result = await session.execute(
            select(Article).where(Article.title == title[:TITLE_MAX_LEN]).limit(1)
        )
        return result.scalars().first() is not None


# ─────────────────────────────────────────────────────────────────────────────
# pgvector Benzerlik Kontrolü
# ─────────────────────────────────────────────────────────────────────────────
async def find_similar_status(
    session:   AsyncSession,
    embedding: list[float],
) -> Optional[str]:
    try:
        stmt = (
            select(
                AnalysisResult.status,
                Article.embedding.cosine_distance(embedding).label("dist"),
            )
            .join(AnalysisResult, AnalysisResult.article_id == Article.id)
            .where(
                Article.embedding.cosine_distance(embedding) < SIMILARITY_THRESHOLD,
                Article.embedding.is_not(None),
            )
            .order_by("dist")
            .limit(1)
        )
        result = await session.execute(stmt)
        row = result.first()
        if row:
            logger.info(
                "Benzer makale bulundu: status=%s dist=%.3f", row.status, row.dist
            )
            return row.status
    except Exception as exc:
        logger.debug("pgvector sorgusu başarısız: %s", exc)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Ana Orkestrasyon
# ─────────────────────────────────────────────────────────────────────────────
async def run_agent_cycle(dry_run: bool = False) -> list[dict]:
    """
    Tek bir tarama döngüsü:
      RSS → duplicate → snippet → NLP + pgvector → sınıfla → DB
    """
    monitor    = RSSMonitor()
    vectorizer = get_vectorizer()

    headlines = monitor.fetch_headlines()
    if not headlines:
        logger.warning("Hiç başlık çekilemedi, döngü atlanıyor.")
        return []

    db_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL
    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    SessionFactory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    processed: list[dict] = []

    for item in headlines:
        if len(processed) >= MAX_HEADLINES:
            break

        title         = item["title"]
        url           = item["url"]
        source_domain = item["source_domain"]
        source_href   = item["source_href"]

        # 1. Duplicate kontrolü
        if not dry_run:
            async with SessionFactory() as session:
                if await monitor.is_duplicate(session, title):
                    logger.debug("Duplicate atlandı: %s", _safe_log(title))
                    continue

        logger.info("Yeni başlık: %s [%s]", _safe_log(title), source_domain or "?")

        # 2. Kaynak sitesinden snippet çek
        snippet = fetch_snippet(source_href, title)
        if snippet:
            logger.info("Snippet alındı (%d karakter).", len(snippet))
        else:
            logger.debug("Snippet alınamadı.")

        # 3. BERT embedding üret
        embedding      = None
        similar_status = None
        if vectorizer:
            try:
                embedding = vectorizer.get_embedding(title)
                if not dry_run and any(v != 0.0 for v in embedding):
                    async with SessionFactory() as session:
                        similar_status = await find_similar_status(
                            session, embedding
                        )
            except Exception as exc:
                logger.warning("Embedding üretilemedi: %s", exc)
                embedding = None

        # 4. Sınıflandırma
        result = classify(
            title,
            snippet=snippet,
            source_domain=source_domain,
            similar_status=similar_status,
        )

        if dry_run:
            processed.append({
                "title":        title,
                "source":       item["source_name"],
                "source_href":  source_href,
                "snippet":      snippet[:150] if snippet else "",
                **result,
            })
            continue

        # 5. DB kaydı
        async with SessionFactory() as session:
            try:
                new_article = Article(
                    title=title,
                    content=(snippet or title)[:2000],
                    raw_content=title,
                    embedding=embedding,
                    status="completed",
                    metadata_info={
                        "origin":               "google_trends_rss",
                        "source_url":           url,
                        "source_name":          item["source_name"],
                        "source_domain":        source_domain,
                        "pub_date":             item.get("pub_date"),
                        "classification_label": result["classification_label"],
                        "agent":                "rule_based_v2",
                    },
                )
                session.add(new_article)
                await session.flush()

                analysis_res = AnalysisResult(
                    article_id=new_article.id,
                    status=result["status"],
                    confidence=result["confidence"],
                    signals=result["signals"],
                )
                session.add(analysis_res)
                await session.commit()

                logger.info(
                    "DB OK → id=%s status=%s conf=%.2f label=%s",
                    new_article.id, result["status"],
                    result["confidence"], result["classification_label"],
                )
                processed.append({
                    "article_id": str(new_article.id),
                    "title":      title,
                    **result,
                })

            except Exception as exc:
                await session.rollback()
                logger.error(
                    "DB kayıt hatası [%s]: %s", _safe_log(title, 40), exc
                )

    await engine.dispose()
    logger.info("Döngü tamamlandı. Yeni başlık: %d", len(processed))
    return processed


# ─────────────────────────────────────────────────────────────────────────────
# CLI Entry Point
# ─────────────────────────────────────────────────────────────────────────────
async def main(dry_run: bool):
    if dry_run:
        results = await run_agent_cycle(dry_run=True)
        print("\n" + "=" * 60)
        print("DRY-RUN SONUÇLARI")
        print("=" * 60)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    logger.info("RSS Agent başlatıldı.")
    while True:
        try:
            await run_agent_cycle(dry_run=False)
        except Exception as e:
            logger.error("Agent döngüsünde kritik hata: %s", e)
        logger.info("Döngü bitti. 60 saniye bekleniyor...")
        await asyncio.sleep(60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Türkiye Gündem RSS Agent")
    parser.add_argument("--dry-run", action="store_true", help="DB'ye yazmadan çalıştır")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
