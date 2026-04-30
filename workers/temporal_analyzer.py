"""
workers/temporal_analyzer.py — Kaynak tarihlerine göre temporal deception analizi.
Gemini veya DB bağımlılığı yok — saf Python, test edilebilir.
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S%z",
    "%d.%m.%Y",
    "%d/%m/%Y",
]

_RECYCLED_GAP_DAYS = 365
_FRESH_THRESHOLD_DAYS = 90
_COORDINATED_MIN_SOURCES = 3


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw_str = str(raw).strip()
    # Try full string first, then truncated to 19 chars for datetime variants
    candidates = [raw_str, raw_str[:19], raw_str[:10]]
    for fmt in _DATE_FORMATS:
        for candidate in candidates:
            try:
                dt = datetime.strptime(candidate, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def analyze_temporal(sources: list[dict]) -> dict:
    """
    Kaynak listesindeki tarih bilgilerine göre temporal analiz üretir.

    Args:
        sources: [{"domain": str, "pub_date": str | None, ...}, ...]

    Returns:
        {
            freshness_flag: "fresh" | "recycled" | "unknown",
            earliest_source_date: str | None,
            latest_source_date: str | None,
            temporal_gap_days: int | None,
            coordinated_spread: bool,
            spread_date: str | None,
            temporal_note: str,
        }
    """
    result = {
        "freshness_flag": "unknown",
        "earliest_source_date": None,
        "latest_source_date": None,
        "temporal_gap_days": None,
        "coordinated_spread": False,
        "spread_date": None,
        "temporal_note": "",
    }

    if not sources:
        return result

    parsed_dates: list[datetime] = []
    for s in sources:
        dt = _parse_date(s.get("pub_date"))
        if dt:
            parsed_dates.append(dt)

    if len(parsed_dates) < 2:
        if len(parsed_dates) == 1:
            result["earliest_source_date"] = parsed_dates[0].strftime("%Y-%m-%d")
            result["latest_source_date"] = parsed_dates[0].strftime("%Y-%m-%d")
        return result

    parsed_dates.sort()
    oldest = parsed_dates[0]
    newest = parsed_dates[-1]
    gap_days = (newest - oldest).days

    result["earliest_source_date"] = oldest.strftime("%Y-%m-%d")
    result["latest_source_date"] = newest.strftime("%Y-%m-%d")
    result["temporal_gap_days"] = gap_days

    now = datetime.now(timezone.utc)
    days_since_newest = (now - newest).days

    if gap_days >= _RECYCLED_GAP_DAYS:
        result["freshness_flag"] = "recycled"
        years = round(gap_days / 365, 1)
        result["temporal_note"] = (
            f"Bu bilgi yaklaşık {years} yıl önce yayınlanmış kaynaklarda da mevcut. "
            f"En eski kaynak: {result['earliest_source_date']}, "
            f"en yeni: {result['latest_source_date']}. "
            f"Eski bilginin yeni bağlamda sunulma ihtimali değerlendirilmeli."
        )
    elif days_since_newest <= _FRESH_THRESHOLD_DAYS:
        result["freshness_flag"] = "fresh"

    # Koordineli yayılım: aynı gün _COORDINATED_MIN_SOURCES+ kaynak
    date_counts: dict[str, int] = {}
    for dt in parsed_dates:
        day_str = dt.strftime("%Y-%m-%d")
        date_counts[day_str] = date_counts.get(day_str, 0) + 1

    for day_str, count in sorted(date_counts.items()):
        if count >= _COORDINATED_MIN_SOURCES:
            result["coordinated_spread"] = True
            result["spread_date"] = day_str
            if result["temporal_note"]:
                result["temporal_note"] += f" Ayrıca {day_str} tarihinde {count} kaynak eş zamanlı yayımladı."
            else:
                result["temporal_note"] = f"{day_str} tarihinde {count} farklı kaynak eş zamanlı yayımladı — koordineli yayılım olası."
            break

    return result
