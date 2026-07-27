from scripts.backfill_ai_analysis_to_graph import (
    map_full_report_verdict,
    should_skip_existing_claim,
)


def test_map_fake_decision():
    assert map_full_report_verdict("SAHTE") == "FAKE"


def test_map_authentic_decisions():
    assert map_full_report_verdict("DOĞRU") == "AUTHENTIC"
    assert map_full_report_verdict("BÜYÜK_ÖLÇÜDE_DOĞRU") == "AUTHENTIC"


def test_map_misleading_decisions_to_fake():
    assert map_full_report_verdict("YANILTICI") == "FAKE"
    assert map_full_report_verdict("BAĞLAMDAN_KOPARILMIŞ") == "FAKE"


def test_map_uncertain_decisions_to_iddia():
    assert map_full_report_verdict("KISMEN_DOĞRU") == "IDDIA"
    assert map_full_report_verdict("KANIT_YETERSİZ") == "IDDIA"


def test_map_unknown_decision_falls_back():
    assert map_full_report_verdict("GEÇERSİZ_DEĞER") == "UNKNOWN"
    assert map_full_report_verdict("") == "UNKNOWN"
    assert map_full_report_verdict(None) == "UNKNOWN"


def test_skip_true_for_training_corpus():
    assert should_skip_existing_claim("TRAINING_CORPUS") is True


def test_skip_true_for_teyit_archive():
    assert should_skip_existing_claim("TEYIT_ARCHIVE") is True


def test_skip_true_for_ai_sourced_claim():
    # Gerçek idempotency: script'in kendi önceki yazdığı satırlar da atlanır,
    # tekrar Gemini çağrısı yapılmaz (bkz. spec §4.5).
    assert should_skip_existing_claim("GEMINI_VERDICT") is True
    assert should_skip_existing_claim("DEEP_REPORT") is True


def test_skip_false_for_no_existing_claim():
    assert should_skip_existing_claim(None) is False
