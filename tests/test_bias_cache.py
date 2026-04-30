import time
import pytest
from unittest.mock import patch


def test_get_bias_returns_none_for_unknown_domain():
    from app.core.bias_cache import get_bias
    with patch("app.core.bias_cache._BIAS_CACHE", {}), \
         patch("app.core.bias_cache._CACHE_LOADED_AT", time.monotonic() + 86400):
        result = get_bias("bilinmeyen.com")
    assert result is None


def test_get_bias_returns_dict_for_known_domain():
    from app.core.bias_cache import get_bias
    fake_cache = {
        "trt.net.tr": {
            "domain": "trt.net.tr",
            "display_name": "TRT",
            "political_lean": 0.85,
            "government_aligned": True,
            "owner_entity": "TRT (Kamu)",
            "media_group": "Devlet Yayıncısı",
            "clickbait_tendency": 0.15,
            "factual_accuracy": 0.55,
        }
    }
    with patch("app.core.bias_cache._BIAS_CACHE", fake_cache), \
         patch("app.core.bias_cache._CACHE_LOADED_AT", time.monotonic() + 86400):
        result = get_bias("trt.net.tr")
    assert result is not None
    assert result["government_aligned"] is True
    assert result["political_lean"] == 0.85


def test_get_bias_normalizes_www_prefix():
    from app.core.bias_cache import get_bias
    fake_cache = {"trt.net.tr": {"domain": "trt.net.tr", "political_lean": 0.85}}
    with patch("app.core.bias_cache._BIAS_CACHE", fake_cache), \
         patch("app.core.bias_cache._CACHE_LOADED_AT", time.monotonic() + 86400):
        result = get_bias("www.trt.net.tr")
    assert result is not None


def test_enrich_sources_fills_bias_fields():
    from app.core.bias_cache import enrich_sources_with_bias
    fake_cache = {
        "trt.net.tr": {
            "domain": "trt.net.tr",
            "display_name": "TRT",
            "political_lean": 0.85,
            "government_aligned": True,
            "owner_entity": "TRT (Kamu)",
            "media_group": "Devlet Yayıncısı",
        }
    }
    sources = [{"domain": "trt.net.tr", "pub_date": "2026-04-15", "stance": "confirms", "excerpt": "test"}]
    with patch("app.core.bias_cache._BIAS_CACHE", fake_cache), \
         patch("app.core.bias_cache._CACHE_LOADED_AT", time.monotonic() + 86400):
        enriched = enrich_sources_with_bias(sources)
    assert enriched[0]["government_aligned"] is True
    assert enriched[0]["political_lean"] == 0.85
    assert enriched[0]["owner_entity"] == "TRT (Kamu)"


def test_enrich_sources_unknown_domain_gets_null_fields():
    from app.core.bias_cache import enrich_sources_with_bias
    with patch("app.core.bias_cache._BIAS_CACHE", {}), \
         patch("app.core.bias_cache._CACHE_LOADED_AT", time.monotonic() + 86400):
        sources = [{"domain": "bilinmeyen.com", "pub_date": "2026-04-15", "stance": "neutral", "excerpt": ""}]
        enriched = enrich_sources_with_bias(sources)
    assert enriched[0]["political_lean"] is None
    assert enriched[0]["government_aligned"] is None


def test_compute_bias_summary_gov_majority():
    from app.core.bias_cache import compute_bias_summary
    sources = [
        {"political_lean": 0.85, "government_aligned": True},
        {"political_lean": 0.90, "government_aligned": True},
        {"political_lean": 0.80, "government_aligned": True},
        {"political_lean": -0.50, "government_aligned": False},
    ]
    result = compute_bias_summary(sources)
    assert "devlet" in result["bias_summary"] or "hükümet" in result["bias_summary"]
    assert 0.0 <= result["source_diversity_score"] <= 1.0


def test_compute_bias_summary_empty():
    from app.core.bias_cache import compute_bias_summary
    result = compute_bias_summary([])
    assert result["source_diversity_score"] == 0.0
    assert "bulunamadı" in result["bias_summary"]
