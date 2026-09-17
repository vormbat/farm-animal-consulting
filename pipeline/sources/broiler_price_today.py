"""대한양계협회 '금일 육계시세'.

협회 홈페이지 첫 화면의 `table.t_price` 를 읽는다. 축산물품질평가원(다봄)
시세와는 출처가 다른 협회 자체 공시가라 화면에서도 별도 패널로 둔다.
게재 시각이 당일 오후 1시라 수집 주기도 그에 맞춘다.
"""

from __future__ import annotations

import re
from typing import Any

from pipeline.core.errors import ParseError
from pipeline.core.html import find_element_text, find_table_rows, parse_int
from pipeline.core.http import fetch_text
from pipeline.core.source import Source
from pipeline.schemas.broiler_today import BroilerToday

HOME_URL = "https://www.poultry.or.kr/"

#: 규격별 단위. 페이지에는 적혀 있지 않아 여기서 붙인다.
#: 대·중·소는 kg 단가, 병아리는 마리 단가다.
UNITS = {"대": "원/kg", "중": "원/kg", "소": "원/kg", "병아리": "원/마리"}

_DATE_LABEL = re.compile(r"^\d{1,2}/\d{1,2}$")


def parse_spec(note: str | None, grade: str) -> str | None:
    """안내 문구에서 규격 설명을 꺼낸다. `대(1.6kg이상)` -> `1.6kg이상`.

    문구에 적힌 값을 그대로 쓰는 이유는, 협회가 규격 기준을 바꾸면
    표보다 이 문구가 먼저 바뀌기 때문이다. 코드에 박아 두면 틀린 값이 남는다.
    """
    if not note:
        return None
    match = re.search(rf"{re.escape(grade)}\(([^)]+)\)", note)
    return match.group(1).strip() if match else None


def parse_broiler_today(html: str) -> dict[str, Any]:
    """홈페이지 HTML 에서 시세 표를 뽑는다."""
    rows = find_table_rows(html, "t_price")
    if len(rows) < 2:
        raise ParseError("금일 육계시세 표(table.t_price)를 찾지 못했습니다")

    header = rows[0]
    if len(header) < 5:
        raise ParseError(f"표 머리글의 열 수가 예상과 다릅니다: {header}")

    date_label = header[0].strip()
    if not _DATE_LABEL.match(date_label):
        raise ParseError(f"기준일 표기가 예상과 다릅니다: {date_label!r}")

    note = find_element_text(html, "div", "price-info")

    parsed_rows: list[dict[str, Any]] = []
    for row in rows[1:]:
        if len(row) < 5:
            continue
        grade = row[0].strip()
        if grade not in UNITS:
            # 협회가 규격을 추가하면 여기서 조용히 빠진다. 스키마의 Grade 와
            # 함께 늘려야 하므로, 아는 규격만 통과시키고 나머지는 버린다.
            continue
        parsed_rows.append(
            {
                "grade": grade,
                "spec": parse_spec(note, grade),
                "unit": UNITS[grade],
                "today": parse_int(row[1]),
                "yesterday": parse_int(row[2]),
                "last_month": parse_int(row[3]),
                "last_year": parse_int(row[4]),
            }
        )

    if not parsed_rows:
        raise ParseError("표는 찾았지만 읽을 수 있는 규격이 한 줄도 없습니다")

    # '대' 는 거래가 가장 많아 항상 값이 있어야 한다. 이 값마저 비면
    # 사이트가 개편됐거나 점검 중이라는 뜻이라 이전 값을 유지하는 편이 낫다.
    large = next((row for row in parsed_rows if row["grade"] == "대"), None)
    if large is None or large["today"] is None:
        raise ParseError("'대' 규격의 금일 시세를 읽지 못했습니다")

    return {"date_label": date_label, "rows": parsed_rows, "note": note}


def collect() -> dict[str, Any]:
    return parse_broiler_today(fetch_text(HOME_URL))


SOURCE = Source(
    id="broiler_price_today",
    title="금일 육계시세(대한양계협회)",
    output="price/broiler_today.json",
    model=BroilerToday,
    schedule="daily_1320",
    source_url=HOME_URL,
    collect=collect,
    optional=frozenset({"note"}),
)
