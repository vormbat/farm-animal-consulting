"""HPAI 집계 로직 테스트.

다른 수집원과 달리 원문 스냅샷을 쓰지 않는다. `build()` 가 하는 일은 파싱이
아니라 **집계 규칙**이고, 그 규칙의 경계(기간 판정 기준·단계 문턱·철새경로)는
손으로 만든 최소 입력으로 짚는 편이 훨씬 또렷하다. 800건짜리 원문을 얼려 두면
어느 줄이 어느 규칙을 검증하는지 알 수 없게 된다.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest

from pipeline.core import clock
from pipeline.core.errors import ParseError
from pipeline.sources.hpai import RECENT_DAYS, WINDOW_DAYS, build, is_hpai, is_wild

NOW = datetime(2026, 9, 21, 12, 0, tzinfo=clock.KST)

POULTRY = "High pathogenicity avian influenza viruses (poultry) (Inf. with)"
WILD = "Influenza A viruses of high pathogenicity (Inf. with) (non-poultry including wild birds)"

ISO_BY_NAME = {
    "Korea (Rep. of)": "KOR",
    "Japan": "JPN",
    "Germany": "DEU",
    "Narnia": "",
}
REGION_BY_ISO = {"KOR": "Asia", "JPN": "Asia", "DEU": "Europe"}


def event(
    country: str,
    *,
    disease: str = POULTRY,
    days_ago: int = 1,
    status: str = "Resolved",
    started_days_ago: int | None = None,
) -> dict[str, Any]:
    submitted = NOW - timedelta(days=days_ago)
    started = NOW - timedelta(days=started_days_ago if started_days_ago is not None else days_ago)
    return {
        "country": country,
        "disease": disease,
        "eventStatus": status,
        "submissionDate": submitted.strftime("%Y-%m-%dT00:00:00.000+00:00"),
        "eventStartDate": started.strftime("%Y-%m-%dT00:00:00.000+00:00"),
    }


def run(events: list[dict[str, Any]]) -> dict[str, Any]:
    return build(events, ISO_BY_NAME, REGION_BY_ISO, now=NOW)


def find(payload: dict[str, Any], name: str) -> dict[str, Any]:
    return next(row for row in payload["countries"] if row["name"] == name)


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        (POULTRY, True),
        (WILD, True),
        # 표기가 pathogenicity / pathogenic 두 가지로 온다.
        ("Influenza A viruses of high pathogenic (poultry)", True),
        ("Low pathogenicity avian influenza (poultry)", False),
        ("Bluetongue virus (Inf. with)", False),
        (None, False),
    ],
)
def test_HPAI_이벤트만_고른다(name: str | None, expected: bool) -> None:
    assert is_hpai(name) is expected


def test_비가금_신고를_야생조류로_센다() -> None:
    assert is_wild(WILD) is True
    assert is_wild(POULTRY) is False


def test_가금과_야생조류를_나눠_센다() -> None:
    payload = run(
        [
            event("Germany"),
            event("Germany", disease=WILD),
            event("Germany", disease=WILD),
        ]
    )
    germany = find(payload, "Germany")
    assert (germany["poultry"], germany["wild"], germany["total"]) == (1, 2, 3)


def test_기간_판정은_신고일_기준이다() -> None:
    # 2024년에 시작해 지금도 진행중인 사례를 발생 시작일로 걸면 통째로 빠진다.
    # 그러면 '현재 진행중'이 화면에서 사라져 상황을 오히려 잘못 보여준다.
    payload = run([event("Korea (Rep. of)", days_ago=3, started_days_ago=400, status="On-going")])
    korea = payload["korea"]
    assert korea is not None
    assert korea["total"] == 1
    assert korea["first"] < korea["latest"]


def test_기간_밖_신고는_빼고_아무것도_없으면_ParseError() -> None:
    with pytest.raises(ParseError, match="집계할 신고가 없습니다"):
        run([event("Germany", days_ago=WINDOW_DAYS + 1)])


def test_진행중이_있으면_진행중_단계다() -> None:
    payload = run([event("Germany", days_ago=150, status="On-going")])
    assert find(payload, "Germany")["level"] == "ongoing"


def test_진행중이_없으면_최근_신고로_가른다() -> None:
    recent = run([event("Germany", days_ago=RECENT_DAYS)])
    assert find(recent, "Germany")["level"] == "recent"
    quiet = run([event("Germany", days_ago=RECENT_DAYS + 1)])
    assert find(quiet, "Germany")["level"] == "quiet"


def test_철새경로_국가만_따로_묶는다() -> None:
    payload = run([event("Korea (Rep. of)"), event("Japan"), event("Germany")])
    assert payload["flyway"]["countries"] == 2
    assert {row["name"] for row in payload["flyway"]["countries_list"]} == {
        "Korea (Rep. of)",
        "Japan",
    }
    assert find(payload, "Germany")["eaaf"] is False


def test_국내_신고가_없으면_korea_는_null_이다() -> None:
    assert run([event("Germany")])["korea"] is None


def test_지역별로_묶고_상위_세_나라를_적는다() -> None:
    payload = run([event("Germany"), event("Germany"), event("Korea (Rep. of)"), event("Japan")])
    regions = {row["name"]: row for row in payload["regions"]}
    assert regions["Europe"]["total"] == 2
    assert regions["Asia"]["countries"] == 2
    assert regions["Asia"]["top"][:2] == ["Japan", "Korea (Rep. of)"]
    # 신고 많은 순으로 늘어놓는다.
    assert [row["name"] for row in payload["regions"]] == ["Asia", "Europe"]


def test_지역을_모르면_기타로_둔다() -> None:
    payload = run([event("Narnia")])
    assert find(payload, "Narnia")["region"] == "기타"


def test_전체_집계가_국가_합과_맞는다() -> None:
    payload = run(
        [
            event("Germany", status="On-going"),
            event("Germany", disease=WILD),
            event("Korea (Rep. of)", disease=WILD),
        ]
    )
    overall = payload["overall"]
    assert overall == {"countries": 2, "total": 3, "poultry": 1, "wild": 2, "ongoing": 1}
    assert overall["total"] == sum(row["total"] for row in payload["countries"])


def test_신고_많은_순으로_늘어놓는다() -> None:
    payload = run([event("Korea (Rep. of)"), event("Germany"), event("Germany")])
    assert [row["name"] for row in payload["countries"]] == ["Germany", "Korea (Rep. of)"]


def test_분류_규칙을_산출물에_담는다() -> None:
    # 검증된 위험도 모델이 아니라는 것을 화면이 그대로 밝힐 수 있어야 한다.
    payload = run([event("Germany")])
    assert str(WINDOW_DAYS) in payload["level_rule"]
    assert str(RECENT_DAYS) in payload["level_rule"]
