"""대한양계협회 홈페이지 파서 골든 테스트.

살아 있는 사이트를 때리지 않고 fixtures/ 에 얼려 둔 스냅샷으로 검증한다.
사이트가 개편되면 이 테스트는 계속 통과하지만 수집은 실패한다 — 그건 의도한
것이다. 파서를 고칠 때 예전 구조도 계속 읽히는지 확인할 기준이 필요하다.
개편에 맞춰 파서를 고칠 때는 새 스냅샷을 픽스처로 함께 넣는다.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.core.errors import ParseError
from pipeline.sources.broiler_price_today import parse_broiler_today, parse_spec

FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "poultry_or_kr_home.html"


@pytest.fixture(scope="module")
def html() -> str:
    return FIXTURE.read_text(encoding="utf-8")


def test_기준일을_읽는다(html: str) -> None:
    assert parse_broiler_today(html)["date_label"] == "09/17"


def test_규격_네_줄을_순서대로_읽는다(html: str) -> None:
    rows = parse_broiler_today(html)["rows"]
    assert [row["grade"] for row in rows] == ["대", "중", "소", "병아리"]


def test_금일_전일_전월_전년을_숫자로_읽는다(html: str) -> None:
    large = parse_broiler_today(html)["rows"][0]
    assert large == {
        "grade": "대",
        "spec": "1.6kg이상",
        "unit": "원/kg",
        "today": 1600,
        "yesterday": 1600,
        "last_month": 2400,
        "last_year": 1800,
    }


def test_병아리는_마리당_단가이고_규격_설명이_없다(html: str) -> None:
    chick = parse_broiler_today(html)["rows"][-1]
    assert chick["unit"] == "원/마리"
    assert chick["spec"] is None
    assert chick["today"] == 720


def test_안내_문구를_한_줄로_잇는다(html: str) -> None:
    # 원문은 <br> 로 두 줄이다. 화면에서 한 줄로 쓰므로 ' · ' 로 잇는다.
    assert parse_broiler_today(html)["note"] == (
        "게재시간 : 당일 오후 1시 · 대(1.6kg이상), 중(1.6kg미만~1.4kg이상), 소(1.4kg미만)"
    )


def test_규격_설명은_안내_문구에서_가져온다() -> None:
    note = "대(2.0kg이상), 중(2.0kg미만~1.5kg이상), 소(1.5kg미만)"
    # 코드에 박아 두지 않으므로 협회가 기준을 바꾸면 그대로 따라간다.
    assert parse_spec(note, "대") == "2.0kg이상"
    assert parse_spec(note, "병아리") is None
    assert parse_spec(None, "대") is None


def test_표가_없으면_ParseError() -> None:
    with pytest.raises(ParseError, match="찾지 못했습니다"):
        parse_broiler_today("<html><body><p>점검 중입니다</p></body></html>")


def test_대_규격_시세가_비면_ParseError(html: str) -> None:
    # '대' 는 거래가 가장 많아 항상 값이 있다. 비었다면 사이트 이상으로 본다.
    broken = html.replace(
        "<td>1,600</td>\n\t\t\t\t\t\t\t\t<td>1,600</td>", "<td>-</td>\n<td>-</td>", 1
    )
    if broken == html:  # 픽스처의 들여쓰기가 달라지면 다른 방법으로 비운다
        broken = html.replace("<td>1,600</td>", "<td>-</td>")
    with pytest.raises(ParseError, match="'대' 규격"):
        parse_broiler_today(broken)


def test_모르는_규격은_버린다(html: str) -> None:
    # 협회가 규격을 추가하면 스키마의 Grade 와 함께 늘려야 한다.
    # 그때까지는 아는 규격만 통과시켜 계약이 깨지지 않게 한다.
    extra = html.replace(
        "<tbody>",
        "<tbody><tr><th scope='row'>특대</th><td>9,900</td><td>9,900</td>"
        "<td>9,900</td><td>9,900</td></tr>",
        1,
    )
    grades = [row["grade"] for row in parse_broiler_today(extra)["rows"]]
    assert "특대" not in grades
