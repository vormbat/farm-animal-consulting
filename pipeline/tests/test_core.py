"""파이프라인 코어 규약 테스트.

여기서 지키는 것은 원본 저장소가 지키던 두 가지 규약이다.
  1. 부분 실패가 정상 데이터를 지우지 않는다.
  2. 모든 시각은 KST 다.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from pydantic import Field

from pipeline.core import clock
from pipeline.core.errors import CollectError, MissingDataError
from pipeline.core.html import find_element_text, find_table_rows, parse_int
from pipeline.core.merge import merge_with_previous
from pipeline.core.output import read_previous, write_json
from pipeline.core.source import Source, run_source
from pipeline.schemas.common import SourcePayload


class SampleModel(SourcePayload):
    egg: int
    chicken: int
    note: str | None = Field(default=None)


def _source(collector, **kwargs) -> Source:
    return Source(
        id="sample",
        title="테스트용",
        output="sample.json",
        model=SampleModel,
        schedule="daily_0900",
        source_url="https://example.test/",
        collect=collector,
        **kwargs,
    )


class TestKST시각:
    def test_러너가_UTC_여도_KST_로_찍는다(self) -> None:
        # 2026-09-17 02:44 UTC = 2026-09-17 11:44 KST
        moment = datetime(2026, 9, 17, 2, 44, tzinfo=UTC)
        assert clock.stamp(moment) == "2026-09-17 11:44 KST"

    def test_자정_전후로_날짜가_KST_기준으로_넘어간다(self) -> None:
        moment = datetime(2026, 9, 17, 16, 0, tzinfo=UTC)
        assert clock.date_string(moment) == "2026-09-18"

    def test_now_kst_는_KST_시간대를_단다(self) -> None:
        assert clock.now_kst().utcoffset() == clock.KST.utcoffset(None)


class Test부분실패:
    def test_실패한_항목만_이전_값으로_되돌린다(self) -> None:
        merged, stale = merge_with_previous(
            {"egg": 2095, "chicken": None},
            {"egg": 1900, "chicken": 1600},
        )
        assert merged == {"egg": 2095, "chicken": 1600}
        assert stale == ["chicken"]

    def test_모두_성공하면_되돌린_항목이_없다(self) -> None:
        merged, stale = merge_with_previous({"egg": 1, "chicken": 2}, {"egg": 0, "chicken": 0})
        assert merged == {"egg": 1, "chicken": 2}
        assert stale == []

    def test_이전_값도_없으면_진짜_실패다(self) -> None:
        with pytest.raises(MissingDataError, match="chicken"):
            merge_with_previous({"egg": 1, "chicken": None}, {"egg": 0})

    def test_이전_값이_None_이면_메울_수_없다(self) -> None:
        with pytest.raises(MissingDataError):
            merge_with_previous({"egg": None}, {"egg": None})


class Test수집원실행:
    def test_정상_수집은_공통_꼬리표를_붙여_쓴다(self, tmp_path: Path) -> None:
        outcome = run_source(_source(lambda: {"egg": 2095, "chicken": 1600}), tmp_path)
        payload = json.loads((tmp_path / "sample.json").read_text(encoding="utf-8"))

        assert outcome.changed is True
        assert payload["egg"] == 2095
        assert payload["stale"] is False
        assert payload["stale_fields"] == []
        assert payload["source_url"] == "https://example.test/"
        assert payload["collected_at"].endswith("KST")

    def test_한_항목만_실패하면_나머지는_갱신된다(self, tmp_path: Path) -> None:
        run_source(_source(lambda: {"egg": 1000, "chicken": 1600}), tmp_path)
        outcome = run_source(_source(lambda: {"egg": 2095, "chicken": None}), tmp_path)
        payload = json.loads((tmp_path / "sample.json").read_text(encoding="utf-8"))

        assert payload["egg"] == 2095, "성공한 항목은 새 값이어야 한다"
        assert payload["chicken"] == 1600, "실패한 항목만 이전 값을 유지해야 한다"
        assert payload["stale"] is True
        assert payload["stale_fields"] == ["chicken"]
        assert outcome.stale_fields == ["chicken"]

    def test_수집이_통째로_실패해도_파일을_비우지_않는다(self, tmp_path: Path) -> None:
        run_source(_source(lambda: {"egg": 1000, "chicken": 1600}), tmp_path)

        def boom() -> dict:
            raise CollectError("사이트 점검 중")

        outcome = run_source(_source(boom), tmp_path)
        payload = json.loads((tmp_path / "sample.json").read_text(encoding="utf-8"))

        assert payload["egg"] == 1000
        assert payload["chicken"] == 1600
        assert payload["stale"] is True
        assert outcome.fell_back is True

    def test_첫_수집부터_실패하면_되돌릴_곳이_없어_터진다(self, tmp_path: Path) -> None:
        def boom() -> dict:
            raise CollectError("사이트 점검 중")

        with pytest.raises(CollectError):
            run_source(_source(boom), tmp_path)
        assert not (tmp_path / "sample.json").exists()

    def test_선택_항목은_없어도_stale_로_세지_않는다(self, tmp_path: Path) -> None:
        source = _source(
            lambda: {"egg": 1, "chicken": 2, "note": None}, optional=frozenset({"note"})
        )
        outcome = run_source(source, tmp_path)
        payload = json.loads((tmp_path / "sample.json").read_text(encoding="utf-8"))

        assert payload["note"] is None
        assert payload["stale"] is False
        assert outcome.stale_fields == []

    def test_내용이_같으면_다시_쓰지_않는다(self, tmp_path: Path) -> None:
        # collected_at 은 매번 바뀌므로, 이 검사는 write_json 수준에서 한다.
        path = tmp_path / "same.json"
        assert write_json(path, {"a": 1}) is True
        assert write_json(path, {"a": 1}) is False
        assert write_json(path, {"a": 2}) is True


class Test산출물읽기:
    def test_깨진_JSON_은_None_으로_읽어_수집을_막지_않는다(self, tmp_path: Path) -> None:
        path = tmp_path / "broken.json"
        path.write_text("{{{", encoding="utf-8")
        assert read_previous(path) is None

    def test_파일이_없으면_None(self, tmp_path: Path) -> None:
        assert read_previous(tmp_path / "missing.json") is None


class TestHTML추출:
    HTML = """
    <table class="other"><tr><td>무시</td></tr></table>
    <table class="t_price">
      <thead><tr><th>09/17</th><th>금일</th></tr></thead>
      <tbody><tr><th>대</th><td>1,600</td></tr></tbody>
    </table>
    <div class="price-info">첫 줄<br>둘째 줄</div>
    """

    def test_class_가_맞는_표만_읽는다(self) -> None:
        assert find_table_rows(self.HTML, "t_price") == [
            ["09/17", "금일"],
            ["대", "1,600"],
        ]

    def test_br_은_구분자로_잇는다(self) -> None:
        assert find_element_text(self.HTML, "div", "price-info") == "첫 줄 · 둘째 줄"

    def test_없는_요소는_None(self) -> None:
        assert find_element_text(self.HTML, "div", "없는클래스") is None
        assert find_table_rows(self.HTML, "없는클래스") == []

    @pytest.mark.parametrize(
        ("text", "expected"),
        [("1,600", 1600), ("720", 720), ("-", None), ("", None), (None, None), ("가", None)],
    )
    def test_천단위_쉼표를_떼고_정수로(self, text: str | None, expected: int | None) -> None:
        assert parse_int(text) == expected
