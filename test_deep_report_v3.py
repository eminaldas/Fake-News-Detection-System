"""
test_deep_report_v3.py — Tam Rapor v3 saf-mantık testleri.
DB/Gemini gerektirmez. Çalıştır: python test_deep_report_v3.py
"""
from workers.deep_report_task import (
    compute_overall_score,
    apply_verdict_score_guard,
    _validate_report_v3,
)


def test_compute_overall_score_weighted():
    subs = {
        "evidence_strength":     {"score": 80},
        "source_reliability":    {"score": 70},
        "consistency_temporal":  {"score": 60},
        "language_manipulation": {"score": 40},
    }
    # 80*.35 + 70*.30 + 60*.20 + 40*.15 = 28 + 21 + 12 + 6 = 67
    assert compute_overall_score(subs) == 67, compute_overall_score(subs)


def test_compute_overall_score_missing_keys_default_zero():
    assert compute_overall_score({}) == 0
    assert compute_overall_score({"evidence_strength": {"score": 100}}) == 35


def test_verdict_guard_clamps_fake_high():
    # Gemini SAHTE der ama 80 skor verirse -> 25'e clamp
    assert apply_verdict_score_guard("SAHTE", 80) == 25


def test_verdict_guard_raises_true_low():
    # DOĞRU der ama 50 verirse -> en az 75
    assert apply_verdict_score_guard("DOĞRU", 50) == 75


def test_verdict_guard_unknown_decision_no_clamp():
    # Tanınmayan verdict -> (0,100) fallback, clamp olmaz
    assert apply_verdict_score_guard("BİLİNMEYEN", 55) == 55


def test_verdict_guard_known_in_range_unchanged():
    # Bilinen verdict, aralık içi değer -> değişmez
    assert apply_verdict_score_guard("KISMEN_DOĞRU", 55) == 55


def test_v3_defaults_invalid_decision():
    out = _validate_report_v3({}, {})
    assert out["schema_version"] == 3
    assert out["verdict"]["decision"] == "KANIT_YETERSİZ"
    assert out["verdict"]["domain"] == "genel"
    assert out["decisive_factors"] == []
    assert set(out["credibility_score"]["sub_scores"].keys()) == {
        "evidence_strength", "source_reliability",
        "consistency_temporal", "language_manipulation",
    }


def test_v3_sorts_decisive_factors_by_weight():
    raw = {"decisive_factors": [
        {"factor": "A", "direction": "supports_fake", "weight": 0.2, "explanation": "a"},
        {"factor": "B", "direction": "supports_true", "weight": 0.9, "explanation": "b"},
    ]}
    out = _validate_report_v3(raw, {})
    assert out["decisive_factors"][0]["factor"] == "B"


def test_v3_overall_respects_verdict_guard():
    raw = {
        "verdict": {"decision": "SAHTE", "domain": "politika"},
        "credibility_score": {"sub_scores": {
            "evidence_strength":     {"score": 90},
            "source_reliability":    {"score": 90},
            "consistency_temporal":  {"score": 90},
            "language_manipulation": {"score": 90},
        }},
        "linguistic": {"manipulation_density": 0.1},
    }
    out = _validate_report_v3(raw, {})
    # SAHTE -> overall <= 25
    assert out["credibility_score"]["overall"] <= 25


def test_v3_language_manipulation_anchored_to_signals():
    # Gemini lm=100 (manipülasyon yok der) ama signal risk yüksek -> aşağı çekilir
    raw = {
        "verdict": {"decision": "KISMEN_DOĞRU", "domain": "genel"},
        "credibility_score": {"sub_scores": {
            "evidence_strength":     {"score": 50},
            "source_reliability":    {"score": 50},
            "consistency_temporal":  {"score": 50},
            "language_manipulation": {"score": 100},
        }},
    }
    out = _validate_report_v3(raw, {"risk_score": 0.8})
    # signal_based = (1-0.8)*100 = 20; blend = 0.5*100 + 0.5*20 = 60
    assert out["credibility_score"]["sub_scores"]["language_manipulation"]["score"] == 60


def test_v3_emits_legacy_verdict_explanation():
    raw = {
        "verdict": {"decision": "SAHTE", "domain": "politika", "one_line": "Asılsız."},
        "decisive_factors": [
            {"factor": "X", "direction": "supports_fake", "weight": 0.8, "explanation": "kanıt yok"},
        ],
    }
    out = _validate_report_v3(raw, {})
    assert out["verdict_explanation"]["primary_reason"] == "Asılsız."
    assert "kanıt yok" in out["verdict_explanation"]["contradicting_evidence"]


if __name__ == "__main__":
    import sys
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  FAIL  {t.__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
