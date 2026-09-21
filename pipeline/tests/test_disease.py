"""양계질병 사전 파서 골든 테스트.

번역은 여기서 검증하지 않는다(외부 서비스다). 대신 **번역을 재사용하는 규칙**은
꼼꼼히 짚는다 — 그게 깨지면 매 실행마다 17만자를 다시 번역하게 되고, 그건
조용히 일어나서 눈치채기 어렵다.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.core.errors import ParseError
from pipeline.sources.disease import (
    EXCLUDE_SLUGS,
    KO_ALIASES,
    clean_text,
    merge_translations,
    parse_detail,
    parse_index,
    previous_by_slug,
)

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


@pytest.fixture(scope="module")
def index_html() -> str:
    return (FIXTURES / "thepoultrysite_index.html").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def detail_html() -> str:
    return (FIXTURES / "thepoultrysite_newcastle.html").read_text(encoding="utf-8")


def test_목록에서_질병을_뽑는다(index_html: str) -> None:
    rows = parse_index(index_html)
    assert len(rows) > 40
    slugs = {row["slug"] for row in rows}
    assert "newcastle-disease" in slugs
    assert "coccidiosis" in slugs


def test_뺀_질병은_목록에_없다(index_html: str) -> None:
    # 여기 두지 않으면 다음 수집 때 원문에서 다시 긁혀 되살아난다.
    slugs = {row["slug"] for row in parse_index(index_html)}
    assert slugs.isdisjoint(EXCLUDE_SLUGS)


def test_목록이_비면_ParseError() -> None:
    with pytest.raises(ParseError, match="질병 목록이 비었습니다"):
        parse_index("<html><body>점검 중</body></html>")


def test_본문_문단과_사진을_짝지어_뽑는다(detail_html: str) -> None:
    rows = parse_detail(detail_html)
    assert len(rows) == 5
    assert rows[0]["en"].startswith("The Newcastle disease (ND) is a highly contagious disease")
    assert all(row["en"] for row in rows)
    # 원문이 사진과 설명을 한 덩어리로 묶어 두므로 짝이 정확히 맞는다.
    assert any(row["image"] for row in rows)
    for row in rows:
        if row["image"]:
            assert row["image"].startswith("http")
            assert not row["image"].lower().endswith(".svg")


def test_뉴스레터_안내는_본문에_넣지_않는다(detail_html: str) -> None:
    for row in parse_detail(detail_html):
        assert "Sign up to our" not in row["en"]


def test_앞머리_그림번호를_뗀다() -> None:
    assert clean_text("<p>255.256.257. The Newcastle disease virus.</p>") == (
        "The Newcastle disease virus."
    )
    assert clean_text("<p>No numbers here.</p>") == "No numbers here."


def test_태그와_엔티티를_푼다() -> None:
    assert clean_text("<p>E.&nbsp;coli  &amp;  <b>Salmonella</b></p>") == "E. coli & Salmonella"


def test_현장_병명을_표제어로_쓴다() -> None:
    # 원문 제목이 전부 대문자라 기계번역이 약어를 망가뜨린다(IB -> Ib).
    assert KO_ALIASES["infectious-bronchitis-ib"][0] == "전염성 기관지염"
    assert "감보로" in KO_ALIASES["infectious-bursal-disease-gumboro"]


def test_영문이_같으면_번역을_재사용한다() -> None:
    old = {"paragraphs": [{"en": "A cat sat.", "ko": "고양이가 앉았다."}]}
    # session 이 None 이면 번역을 부르지 않는다 — 재사용만으로 채워져야 한다.
    merged = merge_translations(None, [{"en": "A cat sat.", "image": None}], old)
    assert merged == [{"en": "A cat sat.", "image": None, "ko": "고양이가 앉았다."}]


def test_새_문단은_번역이_없으면_영문을_남긴다() -> None:
    # 다음 실행이 이 문단만 다시 시도한다. 빈 문자열로 두면 그 자리가 영영 빈다.
    merged = merge_translations(None, [{"en": "A new line.", "image": None}], {})
    assert merged[0]["ko"] == "A new line."


def test_이전_번역이_영문_그대로면_재사용으로_치지_않는다() -> None:
    # 지난번에도 번역에 실패해 영문이 들어가 있는 경우다. 다시 시도해야 한다.
    old = {"paragraphs": [{"en": "Still english.", "ko": "Still english."}]}
    merged = merge_translations(None, [{"en": "Still english.", "image": None}], old)
    assert merged[0]["ko"] == "Still english."


def test_사진이_바뀌어도_번역은_영문으로_찾는다() -> None:
    old = {"paragraphs": [{"en": "Same text.", "ko": "같은 글.", "image": "a.jpg"}]}
    merged = merge_translations(None, [{"en": "Same text.", "image": "b.jpg"}], old)
    assert merged[0] == {"en": "Same text.", "image": "b.jpg", "ko": "같은 글."}


def test_직전_산출물을_슬러그로_편다() -> None:
    previous = {"diseases": [{"slug": "gout", "title_ko": "통풍"}, {"title_ko": "이름없음"}]}
    indexed = previous_by_slug(previous)
    assert set(indexed) == {"gout"}
    assert previous_by_slug(None) == {}
