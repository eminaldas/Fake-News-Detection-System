"""
scripts/eval_claim_retrieval.py
================================
find_precedent_claims'in retrieval isabet oranını eval/golden_claims.jsonl altın setine
karşı ölçer. LLM çağrısı yapmaz (saf DB sorgusu), yalnızca canlı Neo4j/Qdrant DEĞİL,
mevcut PostgreSQL bağlantısı gerektirir.
Sonuç artifacts/eval_claim_retrieval_log.jsonl'a append edilir.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts._eval_common import load_golden_set


def score_retrieval(found_entity_keys: list[str], expected_entities: list[str]) -> dict:
    """En az bir beklenen varlık bulunanlar arasındaysa hit=True (find_precedent_claims'in
    'en az bir ortak varlık' semantiğiyle tutarlı)."""
    found = set(found_entity_keys)
    expected = set(expected_entities)
    return {"hit": bool(found & expected)}


async def _run() -> None:
    from app.db.session import AsyncSessionLocal
    from app.models.models import Entity
    from app.services.claim_graph_service import find_precedent_claims
    from sqlalchemy import select

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    golden = load_golden_set(os.path.join(root, "eval", "golden_claims.jsonl"))

    results = []
    async with AsyncSessionLocal() as session:
        for record in golden:
            entity_keys = record["expected_entities"]
            entity_ids = []
            for key in entity_keys:
                entity_type, normalized_name = key.split("::", 1)
                row = await session.execute(
                    select(Entity.id).where(
                        Entity.entity_type == entity_type,
                        Entity.normalized_name == normalized_name,
                    )
                )
                found_id = row.scalar_one_or_none()
                if found_id:
                    entity_ids.append(found_id)

            precedents = await find_precedent_claims(session, entity_ids)
            found_keys = entity_keys if precedents else []
            scores = score_retrieval(found_keys, entity_keys)
            results.append({"claim_text": record["claim_text"], **scores})
            print(f"{scores} — {record['claim_text'][:60]}")

    hit_rate = sum(1 for r in results if r["hit"]) / len(results)
    print(f"\nHit-rate: {hit_rate:.4f} ({sum(1 for r in results if r['hit'])}/{len(results)})")

    os.makedirs(os.path.join(root, "artifacts"), exist_ok=True)
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hit_rate": round(hit_rate, 4),
        "per_claim": results,
    }
    with open(os.path.join(root, "artifacts", "eval_claim_retrieval_log.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    asyncio.run(_run())
