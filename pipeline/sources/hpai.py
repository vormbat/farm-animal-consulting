"""WOAH WAHIS — 고병원성 조류인플루엔자(HPAI) 발생 현황.

## 왜 점수를 내지 않는가

"발생위험도"를 한 숫자로 내주는 공개 모델은 없다. 실제로 존재하는 전 세계
위험도 모델은 Dellicour 등의 생태적소모델(eLife)인데, 배포되는 것이 480MB짜리
입력자료·R 스크립트 묶음이라 주기적으로 받아 쓸 수 있는 국가별 수치가 아니다.

그래서 위험도를 지어내지 않는다. WAHIS 에 각국이 **공식 신고한 사실**만 모아
세 축으로 정리하고, 분류 규칙은 문자열로 담아 화면에 그대로 띄운다.

  ① 야생조류 vs 가금 — WAHIS 가 질병코드로 나눠 받는다(668 가금 / 671 비가금).
     EFSA 분기보고서는 가금 발생의 90% 이상이 야생조류로부터의 1차 유입이라고
     보고한다. 야생조류 검출을 가금 발생의 선행지표로 볼 근거가 있다.
  ② 철새 이동경로 — 한반도가 속한 EAAF 국가를 따로 묶는다.
  ③ 대륙/지역 — WAHIS 자체 구분을 그대로 쓴다(임의로 나누지 않는다).

## API 메모

`event/filtered-list` 는 POST 로만 받는다(GET 은 400). 서버측 질병 필터는
형식을 찾지 못해(diseases/disease/diseaseIds 모두 무시된다) 최신순으로 여러
페이지를 받아 질병명으로 직접 거른다.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

from pipeline.core import clock
from pipeline.core.errors import ParseError
from pipeline.core.http import Session
from pipeline.core.source import Source
from pipeline.schemas.hpai import Hpai

BASE = "https://wahis.woah.org/api/v1/pi"
EVENT_URL = f"{BASE}/event/filtered-list?language=en"
COUNTRY_URL = f"{BASE}/country/list?language=en"
REGION_URL = f"{BASE}/country/list-geo-region?language=en"
HUMAN_URL = "https://wahis.woah.org/#/event-management"

SOURCE_NAME = "WOAH WAHIS (세계동물보건기구 공식 신고)"

#: 8페이지(800건)면 대략 9개월치가 들어온다.
PAGES = 8
PAGE_SIZE = 100
WINDOW_DAYS = 180
#: 진행중이 없을 때 '최근신고' 로 볼 기간.
RECENT_DAYS = 90

#: 동아시아-대양주 철새경로(EAAF). EAAFP 가 밝히는 22개국에 지리적으로 경로상에
#: 있는 대만을 더했다. 한국 양계 관점에서 가장 중요한 선행 관찰 대상이라 따로 묶는다.
EAAF_ISO = frozenset(
    {
        "USA", "RUS", "MNG", "CHN", "PRK", "KOR", "JPN", "PHL", "VNM", "LAO",
        "THA", "KHM", "MMR", "BGD", "IND", "MYS", "SGP", "BRN", "IDN", "TLS",
        "PNG", "AUS", "NZL", "TWN",
    }
)  # fmt: skip
KOREA_ISO = "KOR"

LEVEL_RULE = (
    f"최근 {WINDOW_DAYS}일 신고를 기준으로 분류 — "
    "진행중: WOAH에 '진행중(On-going)'으로 신고된 발생이 있음 · "
    f"최근신고: 진행중은 없으나 {RECENT_DAYS}일 내 신고가 있음 · "
    f"소강: {RECENT_DAYS}일 넘게 신고 없음"
)

_DATE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")


def is_hpai(disease: str | None) -> bool:
    """가금(668)·비가금(671) 두 질병명을 모두 잡는다."""
    name = (disease or "").lower()
    return "influenza" in name and "high pathogenic" in name.replace("pathogenicity", "pathogenic")


def is_wild(disease: str | None) -> bool:
    return "non-poultry" in (disease or "").lower()


def parse_day(stamp: str | None) -> datetime | None:
    """`2026-08-20T00:00:00.000+00:00` -> 날짜."""
    match = _DATE.match(stamp or "")
    if not match:
        return None
    return datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)), tzinfo=clock.KST)


def build(
    events: list[dict[str, Any]],
    iso_by_name: dict[str, str],
    region_by_iso: dict[str, str],
    now: datetime | None = None,
) -> dict[str, Any]:
    """신고 목록을 화면이 쓰는 모양으로 집계한다."""
    at = now or clock.now_kst()
    cutoff = at - timedelta(days=WINDOW_DAYS)

    per: dict[str, dict[str, Any]] = {}
    for event in events:
        # 기간 판정은 '신고 활동일' 기준이다. 발생 시작일로 걸면 2024년에 시작해
        # 지금도 진행중인 사례(네덜란드·한국 등)가 통째로 빠져 현재 상황을
        # 오히려 잘못 보여준다. 시작일은 표시용으로만 쓴다.
        submitted = parse_day(event.get("submissionDate"))
        if not submitted or submitted < cutoff:
            continue
        started = parse_day(event.get("eventStartDate")) or submitted

        name = (event.get("country") or "").strip()
        iso = iso_by_name.get(name, "")
        row = per.setdefault(
            name,
            {
                "name": name,
                "iso": iso,
                "region": region_by_iso.get(iso, "기타"),
                "eaaf": iso in EAAF_ISO,
                "poultry": 0,
                "wild": 0,
                "ongoing": 0,
                "latest": None,
                "first": None,
            },
        )

        if is_wild(event.get("disease")):
            row["wild"] += 1
        else:
            row["poultry"] += 1
        if (event.get("eventStatus") or "").lower().startswith("on-going"):
            row["ongoing"] += 1

        latest = submitted.strftime("%Y-%m-%d")
        if not row["latest"] or latest > row["latest"]:
            row["latest"] = latest
        first = started.strftime("%Y-%m-%d")
        if not row["first"] or first < row["first"]:
            row["first"] = first

    countries: list[dict[str, Any]] = []
    for row in per.values():
        row["total"] = row["poultry"] + row["wild"]
        latest_at = parse_day(row["latest"])
        age = (at - latest_at).days if latest_at else 9999
        row["days_since"] = age
        row["level"] = (
            "ongoing" if row["ongoing"] else ("recent" if age <= RECENT_DAYS else "quiet")
        )
        countries.append(row)
    countries.sort(key=lambda row: (-row["total"], row["name"]))

    if not countries:
        raise ParseError(f"최근 {WINDOW_DAYS}일 안에 집계할 신고가 없습니다")

    def tally(rows: list[dict[str, Any]]) -> dict[str, int]:
        return {
            "countries": len(rows),
            "total": sum(row["total"] for row in rows),
            "poultry": sum(row["poultry"] for row in rows),
            "wild": sum(row["wild"] for row in rows),
            "ongoing": sum(row["ongoing"] for row in rows),
        }

    regions = []
    for name in sorted({row["region"] for row in countries}):
        rows = [row for row in countries if row["region"] == name]
        regions.append({**tally(rows), "name": name, "top": [row["name"] for row in rows[:3]]})
    regions.sort(key=lambda region: -region["total"])

    flyway_rows = [row for row in countries if row["eaaf"]]

    return {
        "window_days": WINDOW_DAYS,
        "source_name": SOURCE_NAME,
        "level_rule": LEVEL_RULE,
        "overall": tally(countries),
        "regions": regions,
        "flyway": {
            "name": "동아시아-대양주 철새경로 (EAAF)",
            "note": (
                "한반도가 속한 철새 이동경로. 경로상 국가의 발생은 "
                "국내 유입 위험을 살피는 선행 관찰 대상이다."
            ),
            **tally(flyway_rows),
            "countries_list": flyway_rows,
        },
        "korea": next((row for row in countries if row["iso"] == KOREA_ISO), None),
        "countries": countries,
    }


def fetch_events(session: Session) -> list[dict[str, Any]]:
    """최신순으로 여러 페이지를 받아 HPAI 이벤트만 추린다."""
    events: list[dict[str, Any]] = []
    for page in range(1, PAGES + 1):
        payload = session.post_json_body(
            EVENT_URL,
            {
                "pageNumber": page,
                "pageSize": PAGE_SIZE,
                "searchText": "",
                "sortColName": "",
                "sortColOrder": "DESC",
                "reportFilters": {},
            },
            # WAHIS 는 페이지 하나가 가끔 응답 없이 오래 끈다. 넉넉히 기다리되
            # 재시도는 코어의 기본값에 맡긴다.
            timeout=90,
        )
        rows = payload.get("list") or []
        if not rows:
            break
        events.extend(row for row in rows if is_hpai(row.get("disease")))

    if not events:
        raise ParseError("HPAI 이벤트를 하나도 받지 못했습니다")
    return events


def collect() -> dict[str, Any]:
    session = Session()

    countries_meta = session.get_json(COUNTRY_URL, timeout=60)
    if not isinstance(countries_meta, list) or not countries_meta:
        raise ParseError("국가 목록을 받지 못했습니다")

    iso_by_name = {row["name"]: row.get("isoCode", "") for row in countries_meta}
    iso_by_area = {row["areaId"]: row.get("isoCode", "") for row in countries_meta}

    region_by_iso: dict[str, str] = {}
    for region in session.get_json(REGION_URL, timeout=60):
        for area_id in region.get("countryIds", []):
            iso = iso_by_area.get(area_id)
            if iso:
                region_by_iso[iso] = region["name"]

    return build(fetch_events(session), iso_by_name, region_by_iso)


SOURCE = Source(
    id="hpai",
    title="HPAI 발생 현황(WOAH WAHIS)",
    output="hpai/latest.json",
    model=Hpai,
    schedule="daily_0900",
    source_url=HUMAN_URL,
    collect=collect,
    optional=frozenset({"korea"}),
)
