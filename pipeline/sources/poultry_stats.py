"""축산유통 통계누리(mtrace.go.kr) — 산란계·육계 사육 통계.

통계표 DT_1EO071 "닭 시도 용도별(산란계,육용계) 사육규모별 가구수 및 마리수".
사육규모별(1만 미만 / 1만~3만 …) 세부는 받지 않고 합계(`OV_L2_ID=00`)만 쓴다.

## 이 사이트를 다루는 법

KOSIS 계열 OLAP 이라 절차가 정해져 있다.

1. `statHtml.do` 를 GET 해 **세션을 받는다.** 건너뛰면 뒤의 POST 가 통하지 않는다.
2. `periodDivSelect.do` 로 조회 가능한 분기 목록을 받는다.
3. `html.do` 로 표 HTML 이 담긴 JSON 을 받는다.

핵심은 `fieldList` 다. 화면에서 자바스크립트가 채우는 값이라 1)의 HTML 에는
비어 있는데, 없으면 서버가 조회 대신 안내 HTML 을 **200 OK 로** 돌려준다.

그리고 **보내는 값이 적어야 통한다.** 브라우저가 실제로 싣는 150여 개 필드를
그대로 흉내 내면 서버가 `errMsg` 로 거절한다. 여기 있는 것이 조회에 필요한
최소 집합이고, 필드를 늘리는 쪽이 아니라 줄이는 쪽이 맞는 방향이다.
"""

from __future__ import annotations

import json
import re
from typing import Any

from pipeline.core.errors import ParseError
from pipeline.core.http import Session
from pipeline.core.source import Source
from pipeline.schemas.poultry_stats import PoultryStats

BASE = "https://mtrace.go.kr"
ORG_ID = "323"
TBL_ID = "DT_1EO071"
LIST_ID = "323_003_001"
TABLE_NAME = "닭 시도 용도별(산란계,육용계) 사육규모별 가구수 및 마리수"

PAGE_URL = (
    f"{BASE}/statHtml/statHtml.do?orgId={ORG_ID}&tblId={TBL_ID}"
    f"&vw_cd=xtl&list_id={LIST_ID}&conn_path=MT_ZTITLE"
)
PERIOD_URL = f"{BASE}/statHtml/periodDivSelect.do"
TABLE_URL = f"{BASE}/statHtml/html.do"
#: 화면에서 사람이 같은 표를 볼 수 있는 주소. 위의 조회 주소는 그냥 열면 빈 화면이다.
HUMAN_URL = f"{BASE}/stats/stp/dtl/stl/xtlStatsList.do"

AJAX_HEADERS = {
    "Referer": PAGE_URL,
    "X-Requested-With": "XMLHttpRequest",
    "Origin": BASE,
}

#: 표의 열 순서와 같아야 한다.
ITEMS = ("T01", "T02", "T03", "T04")
#: 시도 코드(00=전국). 사육 실적이 없는 시도는 서버가 '-' 로 준다.
SIDO = (
    "00", "11", "21", "22", "23", "24", "25", "26", "29",
    "41", "31", "32", "33", "34", "35", "36", "37", "38", "39",
)  # fmt: skip

#: `202602` / `20262` 둘 다 온다. 분기는 1~4 뿐이라 그 밖은 분기 코드가 아니다.
_PERIOD_CODE = re.compile(r"(\d{4})0?([1-4])")
_ROW = re.compile(r"<tr>([\s\S]*?)</tr>")
_HEAD_CELL = re.compile(r"<td class='first'[^>]*title='([^']*)'")
_VALUE_CELL = re.compile(r"<td class='value'[^>]*title='([^']*)'")
_INT = re.compile(r"-?\d+")


def label_period(code: str | None) -> str:
    """`202602` -> `2026 2/4`. 모양이 다르면 원문 코드를 그대로 보여 준다."""
    match = _PERIOD_CODE.fullmatch(code or "")
    return f"{match.group(1)} {match.group(2)}/4" if match else (code or "")


def _base_form() -> dict[str, str]:
    cells = len(SIDO) * len(ITEMS)
    return {
        "orgId": ORG_ID,
        "tblId": TBL_ID,
        "language": "ko",
        "colAxis": "TIME,ITEM",
        "rowAxis": "A,B",
        "isFirst": "N",
        "contextPath": "/statHtml",
        "vwCd": "xtl",
        "listId": LIST_ID,
        "connPath": "MT_ZTITLE",
        "statId": "1976001",
        "pubLog": "0",
        "viewKind": "1",
        "doAnal": "N",
        "dataOpt": "ko",
        "view": "table",
        "existStblCmmtKor": "Y",
        "existStblCmmtEng": "N",
        "classAllArr": '[{"objVarId":"A","ovlSn":"1"},{"objVarId":"B","ovlSn":"2"}]',
        "classSet": (
            '[{"objVarId":"A","ovlSn":"1","visible":"true"},'
            '{"objVarId":"B","ovlSn":"2","visible":"true"}]'
        ),
        "selectAllFlag": "N",
        "periodStr": "Q",
        "tblNm": TABLE_NAME,
        "itemMultiply": str(cells),
        "dbUser": "NSI_IN_323.",
        "usePivot": "N",
        "isChangedTableType": "N",
        "isChangedPeriodCo": "N",
        "isChangedPrdSort": "N",
        "p_classAllChkYn": "N",
        "p_classAllSelectYn": "N",
        "first_open": "Y",
        "reqCellCnt": str(cells * 2),
        "inheritYn": "N",
        "tableType": "default",
        "dataOpt2": "ko",
        "prdSort": "desc",
        "findData": "on",
        "pointType": "screen",
        "naviInfo": "tabTimeText",
        "itemChkLi": ITEMS[-1],
        "classAllSelect": "on",
        "classLvlAllChk1_1": "on",
        "classChkLi1_1": "39=",
        "classLvlAllChk2_1": "on",
        "classChkLi2_1": "20=",
        "defaultFolder": "1",
        "headCheck": "Q",
        "timeChkQ": "",
    }


def fetch_periods(session: Session) -> list[str]:
    payload = session.post_json(PERIOD_URL, _base_form(), headers=AJAX_HEADERS, timeout=40)
    codes = {row["prdDe"] for row in payload.get("result", []) if row.get("prdDe")}
    if not codes:
        raise ParseError("조회 가능한 분기가 없습니다")
    return sorted(codes)


def fetch_table_html(session: Session, periods: list[str]) -> str:
    field_list: list[dict[str, str]] = [
        {"targetId": "PRD", "targetValue": "", "prdValue": f"Q,{','.join(periods)},@"}
    ]
    field_list += [{"targetId": "ITM_ID", "targetValue": item, "prdValue": ""} for item in ITEMS]
    field_list += [{"targetId": "OV_L1_ID", "targetValue": code, "prdValue": ""} for code in SIDO]
    # 사육규모 합계만.
    field_list += [{"targetId": "OV_L2_ID", "targetValue": "00", "prdValue": ""}]

    form = _base_form()
    form["timeChkQ"] = periods[-1]
    form["fieldList"] = json.dumps(field_list, ensure_ascii=False)

    payload = session.post_json(TABLE_URL, form, headers=AJAX_HEADERS, timeout=60)
    if payload.get("errMsg"):
        raise ParseError(f"통계누리가 조회를 거절했습니다: {payload['errMsg']}")
    result = payload.get("result")
    if not result:
        raise ParseError("응답에 표가 없습니다")
    return str(result[0])


def parse_int(raw: str | None) -> int | None:
    text = (raw or "").replace(",", "").strip()
    return int(text) if _INT.fullmatch(text) else None


def parse_table(html: str, period_count: int) -> dict[str, list[int | None]]:
    """행마다 시도명 + (분기 × 항목4) 값."""
    table: dict[str, list[int | None]] = {}
    wanted = period_count * len(ITEMS)
    for row in _ROW.findall(html):
        heads = _HEAD_CELL.findall(row)
        values = [parse_int(value) for value in _VALUE_CELL.findall(row)]
        if not heads or not values:
            continue
        name = heads[0].strip()
        if name and len(values) >= wanted:
            table[name] = values[:wanted]
    if not table:
        raise ParseError("표에서 시도 행을 하나도 읽지 못했습니다")
    return table


def _species(
    values: list[int | None], periods: list[str], farms_at: int, birds_at: int
) -> dict[str, Any]:
    def slot(period_index: int, item_index: int) -> int | None:
        index = period_index * len(ITEMS) + item_index
        return values[index] if index < len(values) else None

    has_previous = len(periods) > 1
    farms, birds = slot(0, farms_at), slot(0, birds_at)
    prev_farms = slot(1, farms_at) if has_previous else None
    prev_birds = slot(1, birds_at) if has_previous else None

    def percent(now: int | None, before: int | None) -> float | None:
        if now is None or not before:
            return None
        return round((now - before) / before * 100, 1)

    return {
        "farms": farms,
        "birds": birds,
        "prev_farms": prev_farms,
        "prev_birds": prev_birds,
        "farms_pct": percent(farms, prev_farms),
        "birds_pct": percent(birds, prev_birds),
        "per_farm": round(birds / farms) if farms and birds else None,
    }


def _share(part: int | None, whole: int | None) -> float | None:
    return round(part / whole * 100, 1) if part and whole else None


def build(table: dict[str, list[int | None]], periods: list[str]) -> dict[str, Any]:
    """표를 화면이 쓰는 모양으로. periods 는 [최신, 직전] 순이다."""
    national = table.get("전국")
    if not national:
        raise ParseError("표에 '전국' 행이 없습니다")

    layer = _species(national, periods, 0, 1)
    broiler = _species(national, periods, 2, 3)
    if not layer["birds"] or not broiler["birds"]:
        raise ParseError("전국 마리수를 읽지 못했습니다")

    regions: list[dict[str, Any]] = []
    for name, values in table.items():
        if name == "전국":
            continue
        region_layer = _species(values, periods, 0, 1)
        region_broiler = _species(values, periods, 2, 3)
        # 사육 실적이 없는 시도는 싣지 않는다. 0 만 늘어선 줄은 읽는 데 방해가 된다.
        if not region_layer["birds"] and not region_broiler["birds"]:
            continue

        regions.append(
            {
                "name": name,
                "layer": region_layer,
                "broiler": region_broiler,
                "layer_share": _share(region_layer["birds"], layer["birds"]),
                "broiler_share": _share(region_broiler["birds"], broiler["birds"]),
            }
        )

    regions.sort(key=lambda row: -((row["layer"]["birds"] or 0) + (row["broiler"]["birds"] or 0)))

    return {
        "period": label_period(periods[0]),
        "period_code": periods[0],
        "prev_period": label_period(periods[1]) if len(periods) > 1 else None,
        "table_name": TABLE_NAME,
        "layer": layer,
        "broiler": broiler,
        "regions": regions,
    }


def collect() -> dict[str, Any]:
    session = Session()
    # 세션 확보. 응답 내용은 쓰지 않지만 이 GET 이 없으면 뒤의 POST 가 거절당한다.
    session.get(PAGE_URL, timeout=40)

    periods = fetch_periods(session)
    # 최신 분기와 그 직전 분기. [최신, 직전] 순으로 뒤집어 넘긴다.
    target = periods[-2:][::-1]

    html = fetch_table_html(session, target)
    return build(parse_table(html, len(target)), target)


SOURCE = Source(
    id="poultry_stats",
    title="산란계·육계 사육 통계(통계누리)",
    output="price/poultry_stats.json",
    model=PoultryStats,
    schedule="monthly",
    source_url=HUMAN_URL,
    collect=collect,
)
