"""다봄 산란계 시세 파서 골든 테스트."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from pipeline.core.errors import ParseError
from pipeline.sources.layer_price import (
    parse_chick,
    parse_egg,
    parse_old_hen,
    resolve_date,
)

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


def _fixture(name: str) -> str:
    return (FIXTURES / f"{name}.html").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def egg_html() -> str:
    return _fixture("dabom_egg_nation")


@pytest.fixture(scope="module")
def chick_html() -> str:
    return _fixture("dabom_egg_chick")


@pytest.fixture(scope="module")
def old_hen_html() -> str:
    return _fixture("dabom_egg_oldhen")


class Test연도유추:
    """표의 날짜 칸에는 연도가 없어 조회 기간에서 유추한다."""

    def test_기간_안쪽_날짜에_연도를_붙인다(self) -> None:
        start, end = date(2026, 8, 18), date(2026, 9, 18)
        assert resolve_date("09월 17일", start, end) == "2026-09-17"
        assert resolve_date("08월 18일", start, end) == "2026-08-18"

    def test_연말을_걸친_기간도_맞게_가른다(self) -> None:
        start, end = date(2025, 12, 20), date(2026, 1, 19)
        assert resolve_date("12월 29일", start, end) == "2025-12-29"
        assert resolve_date("01월 05일", start, end) == "2026-01-05"

    def test_날짜가_아닌_칸은_None(self) -> None:
        start, end = date(2026, 8, 18), date(2026, 9, 18)
        # 머리글 둘째 줄('30개')이 여기서 걸러진다.
        assert resolve_date("30개", start, end) is None
        assert resolve_date("", start, end) is None

    def test_기간_밖_날짜는_버린다(self) -> None:
        start, end = date(2026, 8, 18), date(2026, 9, 18)
        assert resolve_date("03월 02일", start, end) is None


class Test계란:
    def test_특란_10개와_30개를_모두_읽는다(self, egg_html: str) -> None:
        egg = parse_egg(egg_html)
        assert egg["latest_date"] == "2026-09-17"
        assert egg["latest_per_10"] == 2098
        assert egg["latest_per_30"] == 6295

    def test_30개를_10개의_3배로_계산하지_않는다(self, egg_html: str) -> None:
        # 원문이 각각 따로 반올림해 3배와 어긋난다. 원문 값을 그대로 써야 대조가 된다.
        egg = parse_egg(egg_html)
        assert egg["latest_per_10"] * 3 != egg["latest_per_30"]

    def test_이력은_최신순이다(self, egg_html: str) -> None:
        dates = [point["date"] for point in parse_egg(egg_html)["rows"]]
        assert dates == sorted(dates, reverse=True)
        assert len(dates) > 15

    def test_값이_빈_칸은_None_으로_남긴다(self, egg_html: str) -> None:
        # 표에 '-' 로 비는 날이 있다. 0 으로 바꾸면 그래프가 바닥으로 꺾인다.
        rows = parse_egg(egg_html)["rows"]
        assert all(point["per_10"] is None or point["per_10"] > 0 for point in rows)

    def test_규격_열은_머리글에서_찾는다(self, egg_html: str) -> None:
        # 2XL 이 아니라 XL 을 집어야 한다(문자열 포함 관계에 걸리기 쉬운 자리).
        egg = parse_egg(egg_html)
        assert egg["grade"] == "특란(XL)"
        assert egg["latest_per_30"] == 6295, "2XL(6,506)을 잘못 집으면 안 된다"

    def test_조회_기간을_못_찾으면_ParseError(self) -> None:
        with pytest.raises(ParseError, match="조회 기간"):
            parse_egg("<table class='table-type1'><tr><td>09월 17일</td></tr></table>")


class Test초생추:
    def test_월_공시를_읽는다(self, chick_html: str) -> None:
        chick = parse_chick(chick_html)
        assert chick["period"] == "month"
        assert chick["latest_date"] == "2026-08"
        assert chick["latest"] == 1990
        assert chick["unit"] == "원/마리"

    def test_표가_없으면_ParseError(self) -> None:
        with pytest.raises(ParseError, match="초생추"):
            parse_chick("<html><body>점검 중</body></html>")


class Test산란노계:
    def test_주_공시는_그_주_시작일로_잡는다(self, old_hen_html: str) -> None:
        # 원문은 '26년 37주 (9/7~9/13)'. 화면에는 9/7 이 찍힌다.
        old_hen = parse_old_hen(old_hen_html)
        assert old_hen["period"] == "week"
        assert old_hen["latest_date"] == "2026-09-07"
        assert old_hen["latest"] == 723

    def test_이력이_최신순으로_여러_주_쌓인다(self, old_hen_html: str) -> None:
        rows = parse_old_hen(old_hen_html)["rows"]
        dates = [point["date"] for point in rows]
        assert dates == sorted(dates, reverse=True)
        assert len(rows) > 5

    def test_표가_없으면_ParseError(self) -> None:
        with pytest.raises(ParseError, match="산란노계"):
            parse_old_hen("<html><body>점검 중</body></html>")


class Test부분실패:
    """세 페이지의 공시 주기가 달라 한쪽만 실패하는 일이 잦다."""

    def test_한_페이지가_죽어도_나머지는_수집된다(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from pipeline.core.errors import CollectError
        from pipeline.sources import layer_price

        def fake_fetch(url: str, **_: object) -> str:
            if url == layer_price.CHICK_URL:
                raise CollectError("연결 거부")
            if url == layer_price.EGG_URL:
                return _fixture("dabom_egg_nation")
            return _fixture("dabom_egg_oldhen")

        monkeypatch.setattr(layer_price, "fetch_text", fake_fetch)
        parts = layer_price.collect()

        assert parts["egg"] is not None, "멀쩡한 항목은 수집돼야 한다"
        assert parts["old_hen"] is not None
        assert parts["chick"] is None, "실패한 항목만 None 으로 넘겨 이전 값이 메우게 한다"

    def test_한_페이지의_구조가_바뀌어도_나머지는_수집된다(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from pipeline.sources import layer_price

        def fake_fetch(url: str, **_: object) -> str:
            if url == layer_price.OLD_HEN_URL:
                return "<html><body>개편 안내</body></html>"
            if url == layer_price.EGG_URL:
                return _fixture("dabom_egg_nation")
            return _fixture("dabom_egg_chick")

        monkeypatch.setattr(layer_price, "fetch_text", fake_fetch)
        parts = layer_price.collect()

        assert parts["egg"] is not None
        assert parts["chick"] is not None
        assert parts["old_hen"] is None
