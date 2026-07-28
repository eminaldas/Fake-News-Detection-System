from ml_engine.scoring.decision_policy import (
    compute_risk,
    ensemble_decision,
    is_strong_manipulative,
    override_confidence,
)


def _signals(**overrides):
    base = {
        "clickbait_score": 0.0,
        "exclamation_ratio": 0.0,
        "caps_ratio": 0.0,
        "hedge_ratio": 0.0,
        "question_density": 0.0,
        "number_density": 0.0,
        "source_score": 0.0,
        "avg_word_length": 5.5,   # baseline -> short_word_penalty = 0
    }
    base.update(overrides)
    return base


def test_compute_risk_zero_signals_is_zero():
    assert compute_risk(_signals()) == 0.0


def test_compute_risk_is_bounded_between_zero_and_one():
    all_max = _signals(
        clickbait_score=1.0, exclamation_ratio=1.0, caps_ratio=1.0,
        hedge_ratio=1.0, question_density=1.0, number_density=1.0,
        avg_word_length=0.0,
    )
    assert 0.0 <= compute_risk(all_max) <= 1.0
    assert compute_risk(all_max) == 1.0  # ham toplam 1.0'ı aşıyor, clip devreye girmeli

    all_min = _signals(source_score=1.0)
    assert compute_risk(all_min) == 0.0  # negatif tarafa taşan değer de clip'lenmeli


def test_compute_risk_source_score_reduces_risk():
    without_source = compute_risk(_signals(clickbait_score=0.5))
    with_source = compute_risk(_signals(clickbait_score=0.5, source_score=1.0))
    assert with_source < without_source


def test_compute_risk_missing_keys_default_to_zero():
    # Prod'da signals dict'i her zaman 8 anahtarı içermeyebilir (ör. eski kayıtlar) —
    # .get(..., 0) fallback'i KeyError atmamalı.
    assert compute_risk({}) == 0.0


def test_is_strong_manipulative_true_cases():
    assert is_strong_manipulative(_signals(clickbait_score=0.20, caps_ratio=0.15))
    assert is_strong_manipulative(_signals(clickbait_score=0.20, exclamation_ratio=0.05))
    assert is_strong_manipulative(_signals(clickbait_score=0.35))
    assert is_strong_manipulative(_signals(clickbait_score=0.06, hedge_ratio=0.10))
    assert is_strong_manipulative(_signals(hedge_ratio=0.20))


def test_is_strong_manipulative_false_for_mild_signals():
    assert not is_strong_manipulative(_signals(clickbait_score=0.05, hedge_ratio=0.02))
    assert not is_strong_manipulative(_signals())


def test_override_confidence_capped_at_point_nine():
    extreme = _signals(clickbait_score=1.0, exclamation_ratio=1.0, caps_ratio=1.0)
    assert override_confidence(extreme) == 0.90


def test_ensemble_decision_weight_one_uses_classifier_only():
    status, combined = ensemble_decision(fake_p=0.9, risk=0.0, model_weight=1.0)
    assert status == "FAKE"
    assert combined == 0.9

    status, combined = ensemble_decision(fake_p=0.1, risk=1.0, model_weight=1.0)
    assert status == "AUTHENTIC"
    assert combined == 0.1


def test_ensemble_decision_weight_zero_uses_risk_only():
    status, combined = ensemble_decision(fake_p=0.0, risk=0.9, model_weight=0.0)
    assert status == "FAKE"
    assert combined == 0.9


def test_ensemble_decision_threshold_boundary():
    # combined tam 0.50 ise FAKE değil AUTHENTIC olmalı (kod: "FAKE if combined > 0.50")
    status, combined = ensemble_decision(fake_p=0.5, risk=0.5, model_weight=0.5)
    assert combined == 0.5
    assert status == "AUTHENTIC"

    status, _ = ensemble_decision(fake_p=0.51, risk=0.51, model_weight=0.5)
    assert status == "FAKE"


def test_ensemble_decision_weighted_average_is_correct():
    status, combined = ensemble_decision(fake_p=0.8, risk=0.2, model_weight=0.55)
    assert combined == 0.55 * 0.8 + 0.45 * 0.2
