"""축산물품질평가원 다봄 — 산란계 관련 산지시세 수집.

다봄의 가격 페이지는 서버에서 표를 그려 내려주므로 표를 그대로 읽는다.
페이지 안에 차트용 데이터가 주석 형태로 들어 있기도 하지만 쓰지 않는다 —
주석은 화면에 보이는 값과 어긋나도 아무도 눈치채지 못하기 때문이다.

표의 날짜 칸에는 연도가 없다(`09월 17일`). 대신 페이지 스크립트가
조회 기간을 `var start = "2026-08-18"; var end = "2026-09-18";` 로 남기므로
거기서 연도를 유추한다. 연말을 걸친 기간도 이 방식으로 맞는다.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from pipeline.core.errors import ParseError
from pipeline.core.html import find_table_rows, parse_int
from pipeline.core.http import fetch_text
from pipeline.core.source import Source
from pipeline.schemas.layer_price import LayerPrice

BASE = "https://www.ekapepia.com/v3/price/livestock/egg"
EGG_URL = f"{BASE}/producer/nation.do"
CHICK_URL = f"{BASE}/chick.do"
OLD_HEN_URL = f"{BASE}/oldAge.do"

#: 화면에서 '원문 ↗' 이 가리킬 곳. 세 페이지의 공통 출발점이다.
SOURCE_URL = "https://www.ekapepia.com/v3/price/livestock/egg/producer/nation.do"

#: 카드에 쓸 계란 규격. 다봄 표의 열 이름과 정확히 일치해야 한다.
EGG_GRADE = "XL"

_RANGE = re.compile(
    r'var\s+start\s*=\s*"(\d{4}-\d{2}-\d{2})"\s*;\s*var\s+end\s*=\s*"(\d{4}-\d{2}-\d{2})"'
)
_MONTH_DAY = re.compile(r"(\d{1,2})\s*월\s*(\d{1,2})\s*일")
_YEAR_MONTH = re.compile(r"(\d{2})\s*년\s*(\d{1,2})\s*월")
_WEEK = re.compile(r"(\d{2})\s*년.*?\((\d{1,2})/(\d{1,2})\s*~")


def _search_range(html: str) -> tuple[date, date]:
    match = _RANGE.search(html)
    if not match:
        raise ParseError("조회 기간(var start/end)을 찾지 못했습니다 — 페이지 구조가 바뀐 듯합니다")
    return date.fromisoformat(match.group(1)), date.fromisoformat(match.group(2))


def resolve_date(label: str, start: date, end: date) -> str | None:
    """`09월 17일` 에 연도를 붙여 `2026-09-17` 로 만든다.

    조회 기간 안에 들어가는 해를 고른다. 기간이 연말을 걸치면 같은 월/일이
    두 해에 다 있을 수 없으므로(기간이 1년을 넘지 않는다) 답은 하나로 정해진다.
    """
    match = _MONTH_DAY.search(label)
    if not match:
        return None
    month, day = int(match.group(1)), int(match.group(2))
    for year in {end.year, start.year}:
        try:
            candidate = date(year, month, day)
        except ValueError:
            continue
        if start <= candidate <= end:
            return candidate.isoformat()
    return None


def _grade_columns(header: list[str]) -> dict[str, int]:
    """머리글의 규격 이름 -> 데이터 행에서 그 규격의 첫 열 위치.

    표는 `날짜 | 2XL | XL | L | M | S` 아래에 규격마다 `30개 | 10개` 두 칸을 둔다.
    열 위치를 상수로 박지 않는 이유는, 다봄이 규격을 하나 빼거나 더하면
    조용히 다른 값을 읽게 되기 때문이다.
    """
    return {name: 1 + index * 2 for index, name in enumerate(header[1:]) if name}


def parse_egg(html: str) -> dict[str, Any]:
    start, end = _search_range(html)
    rows = find_table_rows(html, "table-type1")
    if len(rows) < 3:
        raise ParseError("계란 산지가격 표를 찾지 못했습니다")

    columns = _grade_columns(rows[0])
    if EGG_GRADE not in columns:
        raise ParseError(f"규격 '{EGG_GRADE}' 열이 없습니다. 머리글: {rows[0]}")
    per_30_at = columns[EGG_GRADE]
    per_10_at = per_30_at + 1

    points: list[dict[str, Any]] = []
    for row in rows[1:]:
        resolved = resolve_date(row[0] if row else "", start, end)
        if resolved is None:
            continue  # 머리글 둘째 줄(30개/10개)과 합계 행이 여기서 걸러진다
        if len(row) <= per_10_at:
            continue
        points.append(
            {
                "date": resolved,
                "per_10": parse_int(row[per_10_at]),
                "per_30": parse_int(row[per_30_at]),
            }
        )

    if not points:
        raise ParseError("계란 산지가격 표에서 읽을 수 있는 날짜가 한 줄도 없습니다")

    points.sort(key=lambda point: point["date"], reverse=True)
    latest = next((point for point in points if point["per_10"] is not None), None)

    return {
        "label": "계란 산지가격",
        "region": "전국",
        "grade": "특란(XL)",
        "latest_date": latest["date"] if latest else None,
        "latest_per_10": latest["per_10"] if latest else None,
        "latest_per_30": latest["per_30"] if latest else None,
        "rows": points,
    }


def _series(label: str, unit: str, period: str, points: list[dict[str, Any]]) -> dict[str, Any]:
    points.sort(key=lambda point: point["date"], reverse=True)
    latest = next((point for point in points if point["value"] is not None), None)
    return {
        "label": label,
        "unit": unit,
        "period": period,
        "latest": latest["value"] if latest else None,
        "latest_date": latest["date"] if latest else None,
        "rows": points,
    }


def parse_chick(html: str) -> dict[str, Any]:
    """`26년 08월` 같은 월 공시 표."""
    points: list[dict[str, Any]] = []
    for row in find_table_rows(html, "table-type1"):
        if len(row) < 2:
            continue
        match = _YEAR_MONTH.search(row[0])
        if not match:
            continue
        year = 2000 + int(match.group(1))
        points.append({"date": f"{year}-{int(match.group(2)):02d}", "value": parse_int(row[1])})

    if not points:
        raise ParseError("산란계 초생추 표에서 읽을 수 있는 달이 한 줄도 없습니다")
    return _series("산란계 병아리(초생추)", "원/마리", "month", points)


def parse_old_hen(html: str) -> dict[str, Any]:
    """`26년 37주 (9/7~9/13)` 같은 주 공시 표. 날짜는 그 주의 시작일로 잡는다."""
    points: list[dict[str, Any]] = []
    for row in find_table_rows(html, "table-type1"):
        if len(row) < 2:
            continue
        match = _WEEK.search(row[0])
        if not match:
            continue
        year = 2000 + int(match.group(1))
        month, day = int(match.group(2)), int(match.group(3))
        try:
            started = date(year, month, day)
        except ValueError:
            continue
        points.append({"date": started.isoformat(), "value": parse_int(row[1])})

    if not points:
        raise ParseError("산란노계 표에서 읽을 수 있는 주가 한 줄도 없습니다")
    return _series("산란노계(폐계)", "원/마리", "week", points)


def collect() -> dict[str, Any]:
    """세 페이지를 따로 읽는다.

    한 페이지가 실패해도 나머지는 그대로 갱신되도록 항목별로 예외를 가둔다.
    값이 None 이면 run_source 가 직전 커밋 값으로 메우고 stale 로 표시한다.
    """
    parts: dict[str, Any] = {}
    for key, url, parse in (
        ("egg", EGG_URL, parse_egg),
        ("chick", CHICK_URL, parse_chick),
        ("old_hen", OLD_HEN_URL, parse_old_hen),
    ):
        try:
            parts[key] = parse(fetch_text(url))
        except Exception as error:  # noqa: BLE001 - 어떤 실패든 그 항목만 되돌린다
            print(f"  · {key} 수집 실패 → 이전 값 유지 ({error})")
            parts[key] = None
    return parts


SOURCE = Source(
    id="layer_price",
    title="산란계 관련시세(다봄)",
    output="price/layer.json",
    model=LayerPrice,
    schedule="daily_0900",
    source_url=SOURCE_URL,
    collect=collect,
)
