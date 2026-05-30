"""
test_deep_report_v3.py — Tam Rapor v3 saf-mantık testleri.
DB/Gemini gerektirmez. Çalıştır: python test_deep_report_v3.py
"""
from workers.deep_report_task import (
    compute_overall_score,
    apply_verdict_score_guard,
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
    assert apply_verdict_score_guard("KISMEN_DOĞRU", 55) == 55


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
