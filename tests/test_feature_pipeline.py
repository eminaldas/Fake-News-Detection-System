import itertools

from ml_engine.processing.cleaner import SIGNAL_KEYS, signals_to_vector
from ml_engine.scoring.decision_policy import ensemble_decision

_BERT_EMBEDDING_DIM = 768  # emrecan/bert-base-turkish-cased-mean-nli-stsb-tr sentence embedding boyutu


def test_signal_keys_has_eight_entries():
    assert len(SIGNAL_KEYS) == 8


def test_signals_to_vector_length_matches_signal_keys():
    assert len(signals_to_vector({})) == len(SIGNAL_KEYS)


def test_feature_dimension_is_776():
    # train_classifier.py / workers/tasks.py: feature_vector = embedding + signal_vec
    assert _BERT_EMBEDDING_DIM + len(SIGNAL_KEYS) == 776


def test_signals_to_vector_missing_keys_default_to_zero():
    vec = signals_to_vector({})
    assert vec == [0.0] * len(SIGNAL_KEYS)


def test_signals_to_vector_preserves_signal_key_order():
    signals = {key: float(i) for i, key in enumerate(SIGNAL_KEYS, start=1)}
    vec = signals_to_vector(signals)
    for i, key in enumerate(SIGNAL_KEYS):
        expected = (i + 1) / 10.0 if key == "avg_word_length" else float(i + 1)
        assert vec[i] == expected


def test_signals_to_vector_avg_word_length_is_normalized():
    vec = signals_to_vector({"avg_word_length": 10.0})
    idx = SIGNAL_KEYS.index("avg_word_length")
    assert vec[idx] == 1.0  # 10.0 / _AVG_WORD_LEN_NORM(10.0)


def test_confidence_never_below_half():
    """
    workers/tasks.py: confidence = max(combined, 1-combined). Bu matematiksel bir
    özellik olduğu için MODEL_WEIGHT ne olursa olsun her zaman doğru olmalı —
    hakem PDF'inin yakaladığı "0.40-0.65 aralığı hiç oluşamaz" hatasının kök nedeni
    buydu (GEMINI_ESCALATION_LOW hiçbir zaman tetiklenemiyordu).
    """
    samples = [x / 10 for x in range(0, 11)]  # 0.0, 0.1, ..., 1.0
    for fake_p, risk, weight in itertools.product(samples, samples, samples):
        _, combined = ensemble_decision(fake_p, risk, weight)
        confidence = max(combined, 1.0 - combined)
        assert confidence >= 0.5 - 1e-9
