from scripts.eval_entity_extraction import score_extraction


def test_perfect_match_scores_one():
    predicted = [{"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9}]
    expected = ["PERSON::mehmet_simsek"]
    result = score_extraction(predicted, expected)
    assert result == {"precision": 1.0, "recall": 1.0, "f1": 1.0}


def test_missed_entity_lowers_recall():
    predicted = []
    expected = ["PERSON::mehmet_simsek"]
    result = score_extraction(predicted, expected)
    assert result == {"precision": 0.0, "recall": 0.0, "f1": 0.0}


def test_extra_entity_lowers_precision():
    predicted = [
        {"name": "Mehmet Şimşek", "type": "PERSON", "confidence": 0.9},
        {"name": "Fazladan", "type": "LOCATION", "confidence": 0.7},
    ]
    expected = ["PERSON::mehmet_simsek"]
    result = score_extraction(predicted, expected)
    assert result["precision"] == 0.5
    assert result["recall"] == 1.0


def test_empty_predicted_and_expected_scores_one():
    result = score_extraction([], [])
    assert result == {"precision": 1.0, "recall": 1.0, "f1": 1.0}
