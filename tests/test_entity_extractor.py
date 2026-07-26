from unittest.mock import MagicMock, patch

from ml_engine.processing.entity_extractor import (
    normalize_entity_name,
    validate_extraction_response,
)


def test_normalize_lowercases_turkish_chars():
    assert normalize_entity_name("Mehmet Şimşek") == "mehmet_simsek"


def test_normalize_collapses_whitespace_and_punctuation():
    assert normalize_entity_name("  Fethullah   Gülen. ") == "fethullah_gulen"


def test_normalize_handles_dotted_i():
    assert normalize_entity_name("İran") == "iran"


def test_validate_accepts_well_formed_list():
    raw = [
        {"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9},
        {"name": "İran", "type": "LOCATION", "confidence": 0.8},
    ]
    result = validate_extraction_response(raw)
    assert result == raw


def test_validate_filters_low_confidence():
    raw = [
        {"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9},
        {"name": "Belirsiz", "type": "PERSON", "confidence": 0.3},
    ]
    result = validate_extraction_response(raw)
    assert result == [{"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9}]


def test_validate_rejects_invalid_type():
    raw = [{"name": "X", "type": "ANIMAL", "confidence": 0.9}]
    assert validate_extraction_response(raw) == []


def test_validate_returns_none_for_non_list():
    assert validate_extraction_response({"not": "a list"}) is None


def test_validate_skips_malformed_entries():
    raw = [
        {"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9},
        {"name": "", "type": "PERSON", "confidence": 0.9},         # boş isim
        {"type": "PERSON", "confidence": 0.9},                     # isim yok
        "not_a_dict",
    ]
    result = validate_extraction_response(raw)
    assert result == [{"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9}]


def test_extract_claim_entities_parses_and_filters_gemini_response():
    fake_response = MagicMock()
    fake_response.text = (
        '[{"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9}, '
        '{"name": "Belirsiz", "type": "PERSON", "confidence": 0.2}]'
    )

    with patch(
        "ml_engine.processing.entity_extractor.generate_with_fallback",
        return_value=fake_response,
    ) as mock_call, patch(
        "ml_engine.processing.entity_extractor._get_gemini_client",
        return_value=MagicMock(),
    ):
        from ml_engine.processing.entity_extractor import extract_claim_entities
        result = extract_claim_entities("Bakan Mehmet Şimşek açıklama yaptı.")

    assert result == [{"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9}]
    mock_call.assert_called_once()


def test_extract_claim_entities_returns_empty_on_malformed_json():
    fake_response = MagicMock()
    fake_response.text = "bu json değil"

    with patch(
        "ml_engine.processing.entity_extractor.generate_with_fallback",
        return_value=fake_response,
    ), patch(
        "ml_engine.processing.entity_extractor._get_gemini_client",
        return_value=MagicMock(),
    ):
        from ml_engine.processing.entity_extractor import extract_claim_entities
        result = extract_claim_entities("herhangi bir metin")

    assert result == []
