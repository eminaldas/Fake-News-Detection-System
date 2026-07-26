"""İki eval script'i (eval_entity_extraction.py, eval_claim_retrieval.py) arasında
paylaşılan altın-set yükleme mantığı — tekrarı önlemek için tek yerde."""
import json


def load_golden_set(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]
