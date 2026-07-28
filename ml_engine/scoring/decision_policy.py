"""
Tek karar politikası modülü.

workers/tasks.py (canlı analiz) ve scripts/decision_policy_ablation.py (ölçüm) aynı
risk/override/ensemble mantığını buradan kullanır — böylece "ölçülen sistem" ile
"üretimde çalışan sistem" her zaman birebir aynı koddur, ayrı yerlerde birbirinden
sessizce sapamaz.
"""

# Karar mantığı (ağırlık, override, eşik) her değiştiğinde bump edilmeli — AnalysisResult'a
# yazılır, geçmiş sonuçların hangi politikayla üretildiği sonradan ayırt edilebilsin diye.
# v1: 0.55/0.45 ensemble + strong_manipulative override
# v2: strong_manipulative kaldırıldı, MODEL_WEIGHT deneysel olarak 1.0'a çekildi (2026-07-28,
#     bkz. docs/decision_policy_ablation_report.md)
POLICY_VERSION = "v2-no-override"

_AVG_WORD_LEN_BASELINE = 5.5   # Türkçe haber metni beklenen ortalaması


def compute_risk(signals: dict) -> float:
    """Kural tabanlı risk skoru, [0, 1] aralığına sıkıştırılmış."""
    avg_len = signals.get("avg_word_length", _AVG_WORD_LEN_BASELINE)
    short_word_penalty = max(0.0, (_AVG_WORD_LEN_BASELINE - avg_len) / _AVG_WORD_LEN_BASELINE)

    risk = (
        signals.get("clickbait_score",   0) * 0.30
        + signals.get("exclamation_ratio", 0) * 0.20
        + signals.get("caps_ratio",        0) * 0.15
        + signals.get("hedge_ratio",       0) * 0.15
        + signals.get("question_density",  0) * 0.10
        + signals.get("number_density",    0) * 0.05
        + short_word_penalty               * 0.10
        - signals.get("source_score",      0) * 0.15   # kaynak varsa riski düşür
    )
    return max(0.0, min(risk, 1.0))


def is_strong_manipulative(signals: dict) -> bool:
    """Model hiç çalıştırılmadan doğrudan FAKE'e zorlayan kural-tabanlı override koşulu."""
    clickbait = signals.get("clickbait_score",   0)
    uppercase = signals.get("caps_ratio",        0)
    exclaim   = signals.get("exclamation_ratio", 0)
    hedge     = signals.get("hedge_ratio",       0)

    return (
        (clickbait > 0.15 and uppercase > 0.12) or   # bağırarak sensasyon
        (clickbait > 0.15 and exclaim   > 0.02) or   # clickbait + ünlem
        (clickbait > 0.30) or                         # çoklu komplo/sensasyon ifadesi
        (clickbait > 0.05 and hedge > 0.08) or        # clickbait + anonim kaynak kombinasyonu
        (hedge > 0.15)                                 # yüksek anonim kaynak yoğunluğu
    )


def override_confidence(signals: dict) -> float:
    """strong_manipulative tetiklendiğinde kullanılan güven skoru."""
    clickbait = signals.get("clickbait_score",   0)
    uppercase = signals.get("caps_ratio",        0)
    exclaim   = signals.get("exclamation_ratio", 0)
    return round(min(0.55 + clickbait * 0.50 + exclaim * 2.0 + uppercase * 0.30, 0.90), 4)


def ensemble_decision(fake_p: float, risk: float, model_weight: float) -> tuple[str, float]:
    """combined = model_weight*fake_p + (1-model_weight)*risk üzerinden FAKE/AUTHENTIC kararı döner."""
    combined = model_weight * fake_p + (1.0 - model_weight) * risk
    status = "FAKE" if combined > 0.50 else "AUTHENTIC"
    return status, combined
