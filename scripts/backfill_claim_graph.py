"""
scripts/backfill_claim_graph.py
================================
Mevcut çözülmüş analiz_results + articles (status IS NOT NULL) kayıtlarını tarar,
her biri için varlık çıkarır ve entities/claims/claim_entities tablolarını doldurur.
İdempotent — zaten işlenmiş (claims tablosunda article_id'si olan) kayıtları atlar,
güvenle tekrar çalıştırılabilir. Gemini rate-limitine karşı çağrılar arası bekleme yapar.
"""
import asyncio
import os
import sys
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_RATE_LIMIT_SECONDS = 12.0   # ai_comment kuyruğunun 5/dk limitine benzer bekleme


def filter_unprocessed_article_ids(all_ids: list, already_processed: set) -> list:
    """already_processed'da olmayan id'leri, sırayı koruyarak döner."""
    return [aid for aid in all_ids if aid not in already_processed]


_VALID_STATUSES = (
    "Doğru", "DOĞRU", "doğru",
    "Yanlış", "YANLIŞ", "yanlış",
    "AUTHENTIC", "authentic",
    "FAKE", "fake",
)


def _status_to_verdict(status: str) -> str:
    s = (status or "").strip().lower()
    if any(x in s for x in ("yanlış", "fake")):
        return "FAKE"
    if any(x in s for x in ("doğru", "authentic")):
        return "AUTHENTIC"
    return "UNKNOWN"


async def _run() -> None:
    from datetime import datetime, timezone

    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.models import Article, Claim
    from app.services.claim_graph_service import link_entities, write_claim
    from ml_engine.processing.entity_extractor import extract_claim_entities

    written, skipped, failed = 0, 0, 0

    async with AsyncSessionLocal() as session:
        articles_result = await session.execute(
            select(Article).where(Article.status.in_(_VALID_STATUSES))
        )
        articles = articles_result.scalars().all()

        already_result = await session.execute(select(Claim.article_id))
        already_processed = {row.article_id for row in already_result}

        all_ids = [a.id for a in articles]
        unprocessed_ids = set(filter_unprocessed_article_ids(all_ids, already_processed))
        articles_to_process = [a for a in articles if a.id in unprocessed_ids]

        print(f"Toplam {len(articles)} makale, {len(articles_to_process)} işlenecek "
              f"({len(already_processed)} zaten işlenmiş, atlanıyor).")

        for article in articles_to_process:
            text = article.raw_content or article.content or ""
            if not text.strip():
                skipped += 1
                continue

            try:
                entities = extract_claim_entities(text)
                verdict = _status_to_verdict(article.status)
                claim = await write_claim(
                    session, article.id, verdict, "TRAINING_CORPUS", None,
                    datetime.now(timezone.utc),
                )
                if entities:
                    await link_entities(session, claim.id, entities)
                await session.commit()
                written += 1
                print(f"  [{written}] article_id={article.id} verdict={verdict} "
                      f"entities={len(entities)}")
            except Exception as exc:
                failed += 1
                await session.rollback()
                print(f"  HATA article_id={article.id}: {exc}")

            time.sleep(_RATE_LIMIT_SECONDS)

    print(f"\nBitti — yazıldı={written} atlandı={skipped} hata={failed}")


if __name__ == "__main__":
    asyncio.run(_run())
