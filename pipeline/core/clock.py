"""시각은 전부 KST 로 고정한다.

GitHub Actions 러너의 시계는 UTC 다. 수집 시각을 러너 기준으로 찍으면
화면에 뜨는 "수집 2026-09-17 11:44" 가 원본 발표일과 아홉 시간 어긋나
어느 쪽이 최신인지 대조할 수 없게 된다. 그래서 `datetime.now()` 를
직접 부르지 않고 항상 이 모듈을 거친다.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9), name="KST")


def now_kst() -> datetime:
    return datetime.now(KST)


def stamp(moment: datetime | None = None) -> str:
    """`2026-09-17 11:44 KST` — 화면에 그대로 찍히는 수집 시각 표기."""
    return (moment or now_kst()).astimezone(KST).strftime("%Y-%m-%d %H:%M KST")


def date_string(moment: datetime | None = None) -> str:
    """`2026-09-17`"""
    return (moment or now_kst()).astimezone(KST).strftime("%Y-%m-%d")
