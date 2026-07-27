"""
scripts/backfill_ai_analysis_to_graph.py
==========================================
analysis_results tablosundaki canlı AI analiz sonuçlarını (ai_comment, full_report)
claim grafiğine yazar. TRAINING_CORPUS/TEYIT_ARCHIVE kaynaklı mevcut Claim'lerin
üzerine ASLA yazmaz (insan-doğrulanmış veri AI'ın kendi yargısıyla ezilmez).
full_report ve ai_comment ikisi de doluysa yalnızca full_report işlenir.
Yalnızca created_at >= 2026-06-01 olan analizler dahil edilir (spec §3).
"""
import asyncio
import os
import sys
import time
from datetime import date, datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_RATE_LIMIT_SECONDS = 12.0
_CUTOFF_DATE = date(2026, 6, 1)

_FULL_REPORT_VERDICT_MAP = {
    "SAHTE": "FAKE",
    "YANILTICI": "FAKE",
    "BAĞLAMDAN_KOPARILMIŞ": "FAKE",
    "DOĞRU": "AUTHENTIC",
    "BÜYÜK_ÖLÇÜDE_DOĞRU": "AUTHENTIC",
    "KISMEN_DOĞRU": "IDDIA",
    "KANIT_YETERSİZ": "IDDIA",
}

def map_full_report_verdict(decision: str | None) -> str:
    """full_report['verdict']['decision']'ı (7 değer) Claim.verdict'e (4 değer) daraltır.
    Tanınmayan/eksik değer için UNKNOWN döner."""
    return _FULL_REPORT_VERDICT_MAP.get(decision or "", "UNKNOWN")


def should_skip_existing_claim(existing_source_type: str | None) -> bool:
    """Grafta bu article_id için zaten HERHANGİ bir Claim varsa True döner (kaynak
    türü fark etmez). Bu tek kural hem insan-doğrulanmış veriyi (TRAINING_CORPUS/
    TEYIT_ARCHIVE) korur hem de script'in kendi tekrar çalıştırılmasını idempotent
    yapar (GEMINI_VERDICT/DEEP_REPORT kaynaklı satırlar da tekrar işlenmez)."""
    return existing_source_type is not None


async def _run() -> None:
    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.models import AnalysisResult, Claim
    from app.services.claim_graph_service import link_entities, write_claim
    from ml_engine.processing.entity_extractor import extract_claim_entities

    written, skipped_protected, skipped_empty, failed = 0, 0, 0, 0

    async with AsyncSessionLocal() as session:
        results = await session.execute(
            select(AnalysisResult).where(
                AnalysisResult.created_at >= _CUTOFF_DATE,
            )
        )
        candidates = [
            r for r in results.scalars().all()
            if r.ai_comment is not None or r.full_report is not None
        ]

        print(f"Toplam {len(candidates)} aday analiz (created_at >= {_CUTOFF_DATE}).")

        for result in candidates:
            existing = await session.execute(
                select(Claim.source_type).where(Claim.article_id == result.article_id)
            )
            existing_source_type = existing.scalar_one_or_none()

            if should_skip_existing_claim(existing_source_type):
                skipped_protected += 1
                continue

            # Öncelik: full_report varsa onu kullan, yoksa ai_comment.
            if result.full_report:
                text = (result.full_report or {}).get("overall_assessment") or ""
                decision = ((result.full_report or {}).get("verdict") or {}).get("decision")
                verdict = map_full_report_verdict(decision)
                source_type = "DEEP_REPORT"
            elif result.ai_comment:
                text = (result.ai_comment or {}).get("summary") or ""
                verdict = (result.ai_comment or {}).get("gemini_verdict") or "UNKNOWN"
                source_type = "GEMINI_VERDICT"
            else:
                skipped_empty += 1
                continue

            if not text.strip():
                skipped_empty += 1
                continue

            try:
                entities = extract_claim_entities(text)
                claim = await write_claim(
                    session, result.article_id, verdict, source_type, result.confidence,
                    datetime.now(timezone.utc),
                )
                if entities:
                    await link_entities(session, claim.id, entities)
                await session.commit()
                written += 1
                print(f"  [{written}] article_id={result.article_id} source={source_type} "
                      f"verdict={verdict} entities={len(entities)}")
            except Exception as exc:
                failed += 1
                await session.rollback()
                print(f"  HATA article_id={result.article_id}: {exc}")

            time.sleep(_RATE_LIMIT_SECONDS)

    print(f"\nBitti — yazıldı={written} korunan(atlandı)={skipped_protected} "
          f"boş(atlandı)={skipped_empty} hata={failed}")


if __name__ == "__main__":
    asyncio.run(_run())
