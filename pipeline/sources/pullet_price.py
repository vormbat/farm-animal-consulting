"""대한산란계협회 '중추가격' 게시물의 표 이미지를 읽는다.

협회는 게시물을 새로 올리지 않고 **같은 글의 본문 이미지만 매달 교체**한다.
그래서 목록을 뒤질 필요 없이 글 하나만 계속 본다.

읽는 방식이 이 파일의 전부다. 잘라낼 좌표를 코드에 박는 대신, OCR 이 준
글자 상자의 위치로 표의 행·열을 되살린다. 이미지 크기나 여백이 바뀌어도
표의 모양(연도 6행 × 12개월 + 평균)이 그대로면 계속 읽힌다.

무엇보다 **원문 표에 인쇄된 '평균' 열을 검산에 쓴다.** 숫자를 하나라도
잘못 읽으면 평균이 어긋나므로, 틀린 값이 조용히 화면에 올라가는 일을
구조적으로 막는다. 검산에 실패하면 ParseError 를 던져 이전 값을 유지한다.
"""

from __future__ import annotations

import re
import statistics
from typing import Any

from pipeline.core.errors import ParseError
from pipeline.core.http import fetch_bytes, fetch_text
from pipeline.core.ocr import TextBox, cluster_centers, nearest_index, read_text_boxes
from pipeline.core.source import Source
from pipeline.schemas.pullet_price import PulletPrice

BASE = "https://kegg.or.kr"
POST_URL = f"{BASE}/board/view3?Ncode=breed&number=107"

UNIT = "원/마리"

#: 표 한 줄은 12개월 + 평균 = 13칸이다. 이 수가 맞지 않으면 표가 아니라고 본다.
COLUMNS = 13
MONTHS = 12

#: `6,400` 처럼 천 단위 쉼표가 있는 것만 시세로 본다. 그래프 축 눈금(`7500`)이나
#: 범례의 연도(`2026`)가 섞여 들어오는 것을 이것만으로 거의 다 걸러 낸다.
_VALUE = re.compile(r"^\d{1,3}(?:,\d{3})+$")
_YEAR = re.compile(r"^20\d{2}$")

#: 본문 이미지. 공유용 섬네일(og:image)이 따로 있어서 본문 칸으로 범위를 좁힌다.
_CONTENT_IMAGE = re.compile(
    r"id=['\"]zoom_box['\"].*?<img[^>]+src=['\"]([^'\"]+)['\"]", re.IGNORECASE | re.DOTALL
)
_TITLE = re.compile(
    r"<tr[^>]+class=['\"]vw_tit['\"].*?<h3[^>]*>(.*?)</h3>", re.IGNORECASE | re.DOTALL
)
_TAGS = re.compile(r"<[^>]+>")


def parse_post(html: str) -> dict[str, str]:
    """게시물에서 제목과 본문 이미지 주소를 꺼낸다."""
    image = _CONTENT_IMAGE.search(html)
    if not image:
        raise ParseError("게시물 본문(td#zoom_box)에서 표 이미지를 찾지 못했습니다")

    source = image.group(1).strip()
    url = source if source.startswith("http") else f"{BASE}/{source.lstrip('/')}"

    title_match = _TITLE.search(html)
    title = _TAGS.sub("", title_match.group(1)).strip() if title_match else "중추가격"

    return {"title": title, "image_url": url}


def _data_rows(boxes: list[TextBox]) -> list[tuple[TextBox, list[TextBox]]]:
    """연도 라벨 하나와 같은 줄에 놓인 시세 상자들을 묶는다.

    이미지 위쪽 그래프에도 연도(범례)와 숫자가 있어서 그냥 모으면 섞인다.
    표의 줄은 '연도 라벨 오른쪽에 시세가 여러 개 늘어선 줄' 뿐이라 그것만 남긴다.
    """
    years = [box for box in boxes if _YEAR.match(box.text)]
    values = [box for box in boxes if _VALUE.match(box.text)]

    rows: list[tuple[TextBox, list[TextBox]]] = []
    for year in years:
        tolerance = year.height * 0.6
        members = [
            value
            for value in values
            if abs(value.center_y - year.center_y) <= tolerance and value.center_x > year.center_x
        ]
        # 그래프 범례의 연도에는 같은 줄에 시세가 붙지 않는다.
        if len(members) >= 2:
            rows.append((year, members))

    if not rows:
        raise ParseError("표에서 연도 행을 하나도 찾지 못했습니다")

    # 연도 라벨은 모두 표의 첫 열에 있다. 멀리 떨어진 것은 표 밖의 글자다.
    left = statistics.median([year.center_x for year, _ in rows])
    spread = statistics.median([year.width for year, _ in rows])
    rows = [row for row in rows if abs(row[0].center_x - left) <= spread]

    return sorted(rows, key=lambda row: -int(row[0].text))


def parse_table(boxes: list[TextBox]) -> list[dict[str, Any]]:
    """글자 상자에서 연도별 월 시세를 되살리고 평균으로 검산한다."""
    rows = _data_rows(boxes)

    cell_width = statistics.median([value.width for _, values in rows for value in values])
    centers = cluster_centers(
        (value.center_x for _, values in rows for value in values),
        # 열 간격(약 1.5칸)보다는 좁고 같은 열의 흔들림보다는 넓게.
        tolerance=cell_width * 0.6,
    )
    if len(centers) != COLUMNS:
        raise ParseError(
            f"표의 열이 {COLUMNS}개(12개월+평균)여야 하는데 {len(centers)}개로 읽혔습니다. "
            "협회가 표 모양을 바꿨는지 원문 이미지를 확인하세요."
        )

    parsed: list[dict[str, Any]] = []
    for year, values in rows:
        cells: list[int | None] = [None] * COLUMNS
        for value in values:
            cells[nearest_index(centers, value.center_x)] = int(value.text.replace(",", ""))

        months, average = cells[:MONTHS], cells[MONTHS]
        filled = [month for month in months if month is not None]
        if average is None or not filled:
            raise ParseError(f"{year.text}년 줄에서 평균 또는 월별 값을 읽지 못했습니다")

        # 원문이 소수점을 버리므로(2023년 5,389.83 -> 5,389) 내림으로 맞춰 본다.
        # 반올림하는 해가 섞여 있어도 1원 차이는 허용한다.
        computed = sum(filled) // len(filled)
        if abs(computed - average) > 1:
            raise ParseError(
                f"{year.text}년 검산 실패: 읽은 값의 평균 {computed:,} != 원문 평균 {average:,}. "
                "숫자를 잘못 읽었을 수 있어 이전 값을 유지합니다."
            )

        parsed.append({"year": int(year.text), "months": months, "average": average})

    return parsed


def latest_point(years: list[dict[str, Any]]) -> tuple[int, int, int]:
    """값이 있는 가장 최근 (연, 월, 값). years 는 최신 연도부터다."""
    for row in years:
        for index in range(MONTHS - 1, -1, -1):
            value = row["months"][index]
            if value is not None:
                return row["year"], index + 1, value
    raise ParseError("표에서 값이 있는 달을 하나도 찾지 못했습니다")


def collect() -> dict[str, Any]:
    post = parse_post(fetch_text(POST_URL, use_proxies=False))
    years = parse_table(read_text_boxes(fetch_bytes(post["image_url"], use_proxies=False)))
    year, month, value = latest_point(years)

    return {
        **post,
        "post_url": POST_URL,
        "unit": UNIT,
        "latest": value,
        "latest_year": year,
        "latest_month": month,
        "years": years,
    }


SOURCE = Source(
    id="pullet_price",
    title="산란계 중추가격(대한산란계협회)",
    output="price/pullet.json",
    model=PulletPrice,
    schedule="monthly",
    source_url=POST_URL,
    collect=collect,
    extras=frozenset({"ocr"}),
    # opencv(rapidocr 의존성)가 리눅스에서 libGL.so.1 을 찾는데 러너에는 없다.
    apt_packages=frozenset({"libgl1"}),
)
