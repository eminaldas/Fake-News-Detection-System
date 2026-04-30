import pytest
from workers.temporal_analyzer import analyze_temporal


def test_empty_sources_returns_unknown():
    result = analyze_temporal([])
    assert result["freshness_flag"] == "unknown"


def test_all_fresh_sources():
    sources = [
        {"pub_date": "2026-04-28", "domain": "bbc.com"},
        {"pub_date": "2026-04-27", "domain": "reuters.com"},
        {"pub_date": "2026-04-29", "domain": "ntv.com.tr"},
    ]
    result = analyze_temporal(sources)
    assert result["freshness_flag"] == "fresh"
    assert result["temporal_gap_days"] < 30


def test_recycled_detection():
    sources = [
        {"pub_date": "2019-03-10", "domain": "aa.com.tr"},
        {"pub_date": "2019-03-11", "domain": "trt.net.tr"},
        {"pub_date": "2026-04-15", "domain": "sabah.com.tr"},
    ]
    result = analyze_temporal(sources)
    assert result["freshness_flag"] == "recycled"
    assert result["temporal_gap_days"] > 365
    assert result["coordinated_spread"] is False


def test_coordinated_spread_detection():
    sources = [
        {"pub_date": "2026-04-15", "domain": "sabah.com.tr"},
        {"pub_date": "2026-04-15", "domain": "ahaber.com.tr"},
        {"pub_date": "2026-04-15", "domain": "star.com.tr"},
        {"pub_date": "2026-04-15", "domain": "takvim.com.tr"},
    ]
    result = analyze_temporal(sources)
    assert result["coordinated_spread"] is True
    assert result["spread_date"] == "2026-04-15"


def test_unparseable_dates_return_unknown():
    sources = [
        {"pub_date": "tarih bilinmiyor", "domain": "x.com"},
        {"pub_date": None, "domain": "y.com"},
    ]
    result = analyze_temporal(sources)
    assert result["freshness_flag"] == "unknown"


def test_temporal_note_populated_for_recycled():
    sources = [
        {"pub_date": "2020-01-01", "domain": "aa.com.tr"},
        {"pub_date": "2026-04-15", "domain": "sabah.com.tr"},
    ]
    result = analyze_temporal(sources)
    assert result["temporal_note"] != ""
    assert "yıl" in result["temporal_note"] or "gün" in result["temporal_note"]
