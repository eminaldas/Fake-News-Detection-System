"""
scripts/eval_entity_extraction.py
==================================
entity_extractor.extract_claim_entities'in precision/recall'unu eval/golden_claims.jsonl
altın setine karşı ölçer. Gerçek Gemini çağrısı yapar (retrieval eval'inin aksine).
Sonuç artifacts/eval_entity_extraction_log.jsonl'a append edilir.
"""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_engine.processing.entity_extractor import normalize_entity_name
from scripts._eval_common import load_golden_set


def score_extraction(predicted: list[dict], expected: list[str]) -> dict:
    """predicted: extract_claim_entities çıktısı. expected: ["TYPE::normalized_name", ...]."""
    predicted_keys = {f"{p['type']}::{normalize_entity_name(p['name'])}" for p in predicted}
    expected_keys = set(expected)

    if not predicted_keys and not expected_keys:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0}

    true_positives = predicted_keys & expected_keys
    precision = len(true_positives) / len(predicted_keys) if predicted_keys else 0.0
    recall = len(true_positives) / len(expected_keys) if expected_keys else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4)}


def main() -> None:
    from ml_engine.processing.entity_extractor import extract_claim_entities

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    golden = load_golden_set(os.path.join(root, "eval", "golden_claims.jsonl"))

    results = []
    for record in golden:
        predicted = extract_claim_entities(record["claim_text"])
        scores = score_extraction(predicted, record["expected_entities"])
        results.append({"claim_text": record["claim_text"], **scores})
        print(f"{scores} — {record['claim_text'][:60]}")

    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_recall = sum(r["recall"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)
    print(f"\nOrtalama — precision={avg_precision:.4f} recall={avg_recall:.4f} f1={avg_f1:.4f}")

    os.makedirs(os.path.join(root, "artifacts"), exist_ok=True)
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "avg_precision": round(avg_precision, 4),
        "avg_recall": round(avg_recall, 4),
        "avg_f1": round(avg_f1, 4),
        "per_claim": results,
    }
    with open(os.path.join(root, "artifacts", "eval_entity_extraction_log.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
