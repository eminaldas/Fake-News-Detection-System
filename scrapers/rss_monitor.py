"""
scrapers/rss_monitor.py
========================
Türkiye Gündem AI Agent — RSS Monitor & Gemini 2.0 Flash Fact-Checker

Pipeline:
  1. Google News RSS → başlık + URL listesi
  2. DB title-duplicate kontrolü
  3. DuckDuckGo Radar Taraması (timelimit='y')
  4. Gemini 2.0 Flash Fact-Check analizi
  5. Article + AnalysisResult DB kaydı

Kullanım:
  python -m scrapers.rss_monitor             # Agent döngüsü (tek seferlik)
  python -m scrapers.rss_monitor --dry-run   # DB'ye yazmadan test
"""

import os
import re
import json
import asyncio
import logging
import argparse
from typing import Optional
from urllib.parse import urlparse

import feedparser
from duckduckgo_search import DDGS
from google import genai
from google.genai import types as genai_types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.models import Article, AnalysisResult

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
    """Log injection önlemi: yeni satır ve kontrol karakterlerini siler, kırpar."""
    return re.sub(r"[\r\n\t]", " ", str(text))[:max_len]


# ─────────────────────────────────────────────────────────────────────────────
# Güvenlik Sabitleri
# ─────────────────────────────────────────────────────────────────────────────
TITLE_MAX_LEN    = 500
URL_MAX_LEN      = 500
EVIDENCE_TITLE   = 120
EVIDENCE_HREF    = 200
EVIDENCE_BODY    = 300
SIGNALS_MAX_KEYS = 20
REASONING_MAX    = 500
ALLOWED_STATUSES = frozenset({"dogru", "yalan", "belirsiz"})


# ─────────────────────────────────────────────────────────────────────────────
# Yardımcı Doğrulayıcılar
# ─────────────────────────────────────────────────────────────────────────────
def _validate_url(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return None
        return url[:URL_MAX_LEN]
    except Exception:
        return None


def _clamp_confidence(value) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


from typing import Any

def _sanitize_signals(signals: dict) -> dict[str, Any]:
    if not isinstance(signals, dict):
        return {}
    safe: dict[str, Any] = {}
    for i, (k, v) in enumerate(signals.items()):
        if i >= SIGNALS_MAX_KEYS:
            break
        key = str(k)[:50]
        if isinstance(v, bool):
            safe[key] = v
        elif isinstance(v, int):
            safe[key] = v
        elif isinstance(v, float):
            safe[key] = _clamp_confidence(v)
        else:
            safe[key] = str(v)[:100]
    return safe


def _sanitize_status(status: str) -> str:
    normalized = str(status).lower().strip()
    if normalized not in ALLOWED_STATUSES:
        logger.warning("Geçersiz status '%s' → 'belirsiz'.", _safe_log(status, 30))
        return "belirsiz"
    return normalized


# ─────────────────────────────────────────────────────────────────────────────
# RSS Monitor
# ─────────────────────────────────────────────────────────────────────────────
class RSSMonitor:
    RSS_URL = (
        "https://news.google.com/rss/search"
        "?q=Türkiye&hl=tr&gl=TR&ceid=TR:tr"
    )

    def fetch_headlines(self) -> list[dict]:
        try:
            feed = feedparser.parse(self.RSS_URL)
        except Exception as exc:
            logger.error("RSS parse hatası: %s", exc)
            return []

        HYPE_KEYWORDS = ["iddia", "yalanlama", "açıklandı"]
        headlines = []
        for entry in feed.entries:
            raw_title = entry.get("title", "").strip()
            raw_url   = entry.get("link", "").strip()
            if not raw_title:
                continue
            if not any(kw in raw_title.lower() for kw in HYPE_KEYWORDS):
                continue
            validated_url = _validate_url(raw_url)
            if not validated_url:
                continue
            headlines.append({
                "title": raw_title[:TITLE_MAX_LEN],
                "url":   validated_url,
            })
        logger.info("RSS'ten %d geçerli başlık çekildi (filtre uygulandı).", len(headlines))
        return headlines

    async def is_duplicate(self, session, title: str, title_embedding: Optional[list[float]] = None) -> bool:
        result = await session.execute(
            select(Article).where(Article.title == title[:TITLE_MAX_LEN]).limit(1)
        )
        if result.scalars().first() is not None:
            return True
                
        return False


# ─────────────────────────────────────────────────────────────────────────────
# DuckDuckGo Radar Scanner
# ─────────────────────────────────────────────────────────────────────────────
class RadarScanner:
    MAX_RESULTS = 5

    def search(self, query: str) -> list[dict]:
        safe_query = query[:200]
        try:
            with DDGS() as ddgs:
                raw_results = list(
                    ddgs.text(
                        safe_query,
                        region="tr-tr",
                        timelimit="y",
                        max_results=self.MAX_RESULTS,
                    )
                )
            results = []
            for r in raw_results:
                results.append({
                    "title": str(r.get("title", ""))[:EVIDENCE_TITLE],
                    "href":  str(r.get("href",  ""))[:EVIDENCE_HREF],
                    "body":  str(r.get("body",  ""))[:EVIDENCE_BODY],
                })
            logger.info("Radar: %d sonuç bulundu.", len(results))
            return results
        except Exception as exc:
            logger.warning("DuckDuckGo hatası: %s", exc)
            return []


# ─────────────────────────────────────────────────────────────────────────────
# Gemini 2.0 Flash Fact-Checker  (google-genai yeni SDK)
# ─────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "Sen deneyimli bir Türkçe medya fact-checker'ısın. "
    "Sana bir haber başlığı ve bu haberle ilgili bağımsız kaynaklardan "
    "toplanmış kanıtlar verilecek. Haberi bu kanıtlarla karşılaştır ve "
    "doğruluk analizini gerçekleştir.\n\n"
    "CEVABINI YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir şey yazma:\n"
    "{\n"
    '  "status": "dogru|yalan|belirsiz",\n'
    '  "confidence": <0.0 ile 1.0 arası ondalık sayı>,\n'
    '  "signals": {\n'
    '    "kaynak_sayisi": <integer>,\n'
    '    "celiski": <true|false>,\n'
    '    "manipulatif_dil": <true|false>,\n'
    '    "dogrulayici_kurum_var": <true|false>,\n'
    '    "eksik_ozne": <true|false>\n'
    "  },\n"
    '  "reasoning": "<kısa Türkçe gerekçe, 2-3 cümlelik çıkarım>"\n'
    "}"
)

_FALLBACK = {
    "status": "belirsiz",
    "confidence": 0.0,
    "signals": {
        "kaynak_sayisi": 0,
        "celiski": False,
        "manipulatif_dil": False,
        "dogrulayici_kurum_var": False,
        "eksik_ozne": True,
    },
    "reasoning": "Gemini analizi tamamlanamadı.",
}


class GeminiFactChecker:

    def __init__(self):
        api_key = (os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY bulunamadı veya boş. .env dosyasına ekleyin.\n"
                "→ https://aistudio.google.com/app/apikey"
            )
        self.client = genai.Client(api_key=api_key)
        self.model_name = (os.getenv("GEMINI_MODEL") or getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")).strip()
        logger.info("Gemini modeli hazır: %s", self.model_name)

    def embed_title(self, title: str) -> list[float]:
        try:
            response = self.client.models.embed_content(
                model='text-embedding-004',
                contents=title,
            )
            return response.embeddings[0].values
        except Exception as exc:
            logger.error("Gemini Embedding hatası: %s", exc)
            return []

    def analyze(self, title: str, radar_results: list[dict]) -> dict:
        evidence_parts = []
        for i, r in enumerate(radar_results, 1):
            evidence_parts.append(
                f"\n[Kaynak {i}] {r['title']}\n"
                f"  URL: {r['href']}\n"
                f"  Özet: {r['body']}\n"
            )
        evidence_text = "".join(evidence_parts) or "Bağımsız kaynak bulunamadı."

        safe_title  = title[:TITLE_MAX_LEN]
        user_prompt = (
            f"HABER BAŞLIĞI: {safe_title}\n\n"
            f"BAĞIMSIZ KAYNAK KANITI:{evidence_text}"
        )

        raw = ""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.2,
                ),
            )
            raw = response.text.strip()

            # Markdown code fence temizle
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            parsed = json.loads(raw)

            result = {
                "status":     _sanitize_status(parsed.get("status", "belirsiz")),
                "confidence": _clamp_confidence(parsed.get("confidence", 0.0)),
                "signals":    _sanitize_signals(parsed.get("signals", {})),
                "reasoning":  str(parsed.get("reasoning", ""))[:REASONING_MAX],
            }

            logger.info(
                "Gemini analizi → status=%s confidence=%.2f",
                result["status"], result["confidence"],
            )
            return result

        except json.JSONDecodeError as exc:
            logger.error("Gemini JSON parse hatası: %s | Ham: %s", exc, _safe_log(raw, 200))
            return dict(_FALLBACK)
        except Exception as exc:
            logger.error("Gemini API hatası: %s", exc)
            return dict(_FALLBACK)

            
    def get_embedding(self, text: str) -> Optional[list[float]]:
        """Başlığın 768 boyutlu semantik vektörünü üretir."""
        try:
            # google-genai kütüphanesinde embedding endpoint'i text-embedding-004'tür
            response = self.client.models.embed_content(
                model='text-embedding-004',
                contents=text,
            )
            return response.embeddings[0].values
        except Exception as exc:
            logger.error("Gemini Embedding API hatası: %s", exc)
            return None


# ─────────────────────────────────────────────────────────────────────────────
# Zorunlu Özne Kontrolü
# ─────────────────────────────────────────────────────────────────────────────
def apply_mandatory_subject_check(analysis: dict) -> dict:
    if analysis.get("status") != "dogru":
        return analysis

    signals       = analysis.get("signals", {})
    kaynak_sayisi = int(signals.get("kaynak_sayisi", 0))
    celiski       = bool(signals.get("celiski", True))
    eksik_ozne    = bool(signals.get("eksik_ozne", True))

    if kaynak_sayisi < 2 or celiski or eksik_ozne:
        logger.warning(
            "Zorunlu Özne Kontrolü BAŞARISIZ → 'dogru' iptal. "
            "(kaynak=%d, celiski=%s, eksik_ozne=%s)",
            kaynak_sayisi, celiski, eksik_ozne,
        )
        analysis = dict(analysis)
        analysis["status"]    = "belirsiz"
        analysis["reasoning"] = "[Zorunlu Özne Kontrolü başarısız] " + analysis.get("reasoning", "")
    return analysis


def apply_source_weight(analysis: dict, radar_results: list[dict]) -> dict:
    if analysis.get("status") == "belirsiz":
        return analysis
    has_authoritative = any(
        "teyit.org" in r.get("href", "").lower() or 
        ".gov.tr" in r.get("href", "").lower() or
        "aa.com.tr" in r.get("href", "").lower() or
        "trt.net.tr" in r.get("href", "").lower()
        for r in radar_results
    )
    if has_authoritative:
        analysis = dict(analysis)
        analysis["confidence"] = 1.0
    return analysis


# ─────────────────────────────────────────────────────────────────────────────
# Ana Orkestrasyon
# ─────────────────────────────────────────────────────────────────────────────
async def run_agent_cycle(dry_run: bool = False) -> list[dict]:
    """
    Tek bir tarama döngüsü: RSS → duplicate → radar → Gemini → DB
    
    DB Engine burada (lazy) oluşturulur — Celery fork sonrası engine
    yeniden oluşturularak asyncpg connection çatışması engellenir.
    """
    monitor = RSSMonitor()
    scanner = RadarScanner()
    checker = GeminiFactChecker()

    headlines = monitor.fetch_headlines()
    if not headlines:
        logger.warning("Hiç başlık çekilemedi, döngü atlanıyor.")
        return []

    # Her döngü için taze engine ve session factory
    db_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL
    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    SessionFactory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    processed: list[dict] = []

    for item in headlines:
        title: str = item["title"]
        url:   str = item["url"]

        # 1. Duplicate kontrolü
        article_vector = None
        if not dry_run:
            async with SessionFactory() as session:
                if await monitor.is_duplicate(session, title):
                    logger.debug("Duplicate atlandı (Birebir eşleşme): %s", _safe_log(title))
                    continue

        logger.info("Yeni haber: %s", _safe_log(title))

        # 2. Radar
        radar_results = scanner.search(title)

        # 3. Gemini
        analysis = checker.analyze(title, radar_results)

        # 4. Zorunlu Özne Kontrolü ve Kaynak Ağırlığı
        analysis = apply_mandatory_subject_check(analysis)
        analysis = apply_source_weight(analysis, radar_results)

        if dry_run:
            processed.append({"title": title, "url": url, "analysis": analysis})
            continue

        # 5. DB Kaydı
        async with SessionFactory() as session:
            try:
                # Embedding yoksa vektör kolonu None kalsın ki pgvector hata vermesin veya default değer tutmasın.
                new_article = Article(
                    title=title[:TITLE_MAX_LEN],
                    content=title,
                    raw_content=title,
                    embedding=article_vector if article_vector else None,
                    status="completed",
                    metadata_info={
                        "origin": "trending_topics",
                        "source_url": url,
                        "radar_hits": len(radar_results),
                        "radar_evidence": radar_results, # Kanıt linklerini ve özetlerini sakla
                        "agent": "rss_monitor_v4",
                        "reasoning": analysis.get("reasoning", "")[:REASONING_MAX],
                    },
                )
                session.add(new_article)
                await session.flush()

                analysis_res = AnalysisResult(
                    article_id=new_article.id,
                    status=analysis["status"],
                    confidence=str(analysis["confidence"]),
                    signals=json.dumps(analysis["signals"], ensure_ascii=False),
                )
                session.add(analysis_res)
                await session.commit()

                logger.info(
                    "DB kaydı OK → id=%s status=%s conf=%.2f",
                    new_article.id, analysis["status"], analysis["confidence"],
                )
                processed.append({
                    "article_id": str(new_article.id),
                    "title": title,
                    "analysis": analysis,
                })
            except Exception as exc:
                await session.rollback()
                logger.error("DB kayıt hatası [%s]: %s", _safe_log(title, 40), exc)
                try:
                    failed_article = Article(
                        title=title[:TITLE_MAX_LEN],
                        content=title,
                        raw_content=title,
                        status="failed",
                        metadata_info={"error": str(exc)}
                    )
                    session.add(failed_article)
                    await session.commit()
                except Exception as inner_exc:
                    await session.rollback()
                    logger.error("Failed status kaydedilemedi: %s", inner_exc)

    await engine.dispose()
    logger.info("Döngü tamamlandı. Yeni haber: %d / %d", len(processed), len(headlines))
    return processed


# ─────────────────────────────────────────────────────────────────────────────
# CLI Entry Point
# ─────────────────────────────────────────────────────────────────────────────
async def main(dry_run: bool):
    if dry_run:
        results = await run_agent_cycle(dry_run=True)
        print("\n" + "═" * 60)
        print("DRY-RUN SONUÇLARI")
        print("═" * 60)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    logger.info("Fact-Checking Worker Agent başlatıldı. (60 saniyelik döngü)")
    while True:
        try:
            await run_agent_cycle(dry_run=False)
        except Exception as e:
            logger.error("Agent döngüsünde kritik hata: %s", e)
            
        logger.info("Döngü bitti. 60 saniye boyunca uyuyacak...")
        await asyncio.sleep(60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Türkiye Gündem AI News Agent")
    parser.add_argument("--dry-run", action="store_true", help="DB'ye yazmadan çalıştır")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run))
