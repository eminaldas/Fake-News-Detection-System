from datetime import datetime, timezone, date
from workers.leaderboard_task import _period_window, REWARD_TOP, MIN_PARTICIPANTS


def test_weekly_window_previous_iso_week():
    # Salı 2026-06-23 12:00 UTC → TR 15:00; biten hafta 06-15..06-21 (Pzt–Paz)
    now = datetime(2026, 6, 23, 12, 0, tzinfo=timezone.utc)
    start, end, pend = _period_window("weekly", now)
    assert start == datetime(2026, 6, 14, 21, 0, tzinfo=timezone.utc)   # 06-15 00:00 TR
    assert end   == datetime(2026, 6, 21, 21, 0, tzinfo=timezone.utc)   # 06-22 00:00 TR
    assert pend  == date(2026, 6, 21)                                    # biten haftanın son günü (Paz)


def test_monthly_window_previous_month():
    now = datetime(2026, 6, 10, 5, 0, tzinfo=timezone.utc)
    start, end, pend = _period_window("monthly", now)
    assert start == datetime(2026, 4, 30, 21, 0, tzinfo=timezone.utc)   # 05-01 00:00 TR
    assert end   == datetime(2026, 5, 31, 21, 0, tzinfo=timezone.utc)   # 06-01 00:00 TR
    assert pend  == date(2026, 5, 31)


def test_constants():
    assert REWARD_TOP == {"weekly": 3, "monthly": 5}
    assert MIN_PARTICIPANTS == 5
