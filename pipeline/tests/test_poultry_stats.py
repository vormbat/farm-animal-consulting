"""산란계·육계 사육 통계 파서 골든 테스트.

살아 있는 통계누리를 때리지 않고 `html.do` 응답에 담겨 온 표 HTML 을 얼려 두고 쓴다.
요청을 만드는 쪽(fieldList·최소 파라미터)은 여기서 검증할 수 없고, 깨지면 수집이
실패해 stale 로 드러난다 — 그게 의도한 동작이다.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.core.errors import ParseError
from pipeline.sources.poultry_stats import build, label_period, parse_int, parse_table

FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "mtrace_poultry_stats_table.html"
PERIODS = ["202602", "202601"]


@pytest.fixture(scope="module")
def html() -> str:
    return FIXTURE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def payload(html: str) -> dict:
    return build(parse_table(html, len(PERIODS)), PERIODS)


def test_분기_코드를_사람이_읽는_표기로() -> None:
    assert label_period("202602") == "2026 2/4"
    # 모양이 다르면 지어내지 않고 원문 코드를 그대로 둔다.
    assert label_period("20260") == "20260"
    assert label_period(None) == ""


def test_값이_비면_None() -> None:
    assert parse_int("78,985,355") == 78985355
    assert parse_int("-") is None
    assert parse_int(None) is None
    assert parse_int("") is None


def test_전국_산란계_육계를_읽는다(payload: dict) -> None:
    assert payload["period"] == "2026 2/4"
    assert payload["prev_period"] == "2026 1/4"
    assert payload["layer"]["farms"] == 1022
    assert payload["layer"]["birds"] == 78985355
    assert payload["broiler"]["farms"] == 1800
    assert payload["broiler"]["birds"] == 110898477


def test_직전_분기_대비_증감률을_함께_담는다(payload: dict) -> None:
    layer = payload["layer"]
    assert layer["prev_birds"] == 77747119
    assert layer["birds_pct"] == 1.6
    # 호당 마리수는 화면에서 다시 계산하지 않게 여기서 낸다.
    assert layer["per_farm"] == 77285


def test_시도를_사육_규모_순으로_싣는다(payload: dict) -> None:
    names = [region["name"] for region in payload["regions"]]
    assert names[0] == "전북"
    assert "전국" not in names
    sizes = [
        (region["layer"]["birds"] or 0) + (region["broiler"]["birds"] or 0)
        for region in payload["regions"]
    ]
    assert sizes == sorted(sizes, reverse=True)


def test_사육_실적이_없는_시도는_빼고_비중을_낸다(payload: dict) -> None:
    # 서버는 시도 19개를 주지만 실적이 없는 곳(세종·제주 등)은 '-' 로 온다.
    assert len(payload["regions"]) == 14
    for region in payload["regions"]:
        assert region["layer"]["birds"] or region["broiler"]["birds"]

    layer_total = payload["layer"]["birds"]
    first = payload["regions"][0]
    assert first["layer_share"] == round(first["layer"]["birds"] / layer_total * 100, 1)


def test_시도_비중_합이_100_근처다(payload: dict) -> None:
    total = sum(region["broiler_share"] or 0 for region in payload["regions"])
    assert 99.0 <= total <= 101.0


def test_전국_행이_없으면_ParseError() -> None:
    with pytest.raises(ParseError, match="'전국' 행이 없습니다"):
        build({"경기": [1, 2, 3, 4, 5, 6, 7, 8]}, PERIODS)


def test_전국_마리수를_못_읽으면_ParseError() -> None:
    with pytest.raises(ParseError, match="전국 마리수"):
        build({"전국": [1, None, 3, None, 5, None, 7, None]}, PERIODS)


def test_표를_못_읽으면_ParseError() -> None:
    with pytest.raises(ParseError, match="시도 행"):
        parse_table("<html><body>점검 중입니다</body></html>", len(PERIODS))


def test_분기가_하나뿐이면_증감률_없이_채운다(html: str) -> None:
    # 통계표가 막 생겨 직전 분기가 없을 때도 전국 값은 나와야 한다.
    one = build(parse_table(html, 1), ["202602"])
    assert one["prev_period"] is None
    assert one["layer"]["birds"] == 78985355
    assert one["layer"]["birds_pct"] is None
    assert one["layer"]["prev_birds"] is None
