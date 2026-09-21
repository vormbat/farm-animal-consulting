"""수집원 정의와 실행.

수집원을 하나 추가하려면 `pipeline/sources/` 에 파일을 만들고
모듈 수준에 `SOURCE = Source(...)` 를 두면 된다. 레지스트리가 알아서 찾는다.

수집 함수(`collect`)가 하는 일은 **파싱뿐**이다. 되돌리기·시각 찍기·검증·
원자적 쓰기는 전부 `run_source` 가 맡는다. 그래서 모든 수집원이
부분 실패 규약을 반드시 거치게 된다.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError

from pipeline.core import clock
from pipeline.core.errors import CollectError
from pipeline.core.merge import merge_with_previous
from pipeline.core.output import read_previous, write_json

#: 수집 함수. 값을 못 모은 항목은 None 으로 남긴다 — 그 자리를 이전 값이 메운다.
#: `reuses_previous` 를 켠 수집원은 직전 산출물을 인자로 받는다.
Collector = Callable[..., dict[str, Any]]

#: 수집 함수가 채우지 않는 공통 꼬리표. 되돌리기 대상에서 제외한다.
RESERVED_FIELDS = frozenset({"collected_at", "source_url", "stale", "stale_fields"})


@dataclass(frozen=True)
class Source:
    #: CLI 와 워크플로에서 쓰는 이름. `python -m pipeline run <id>`
    id: str
    #: 워크플로 단계 이름에 쓰는 한국어 이름
    title: str
    #: `data/` 기준 상대 경로. 예: price/broiler_today.json
    output: str
    #: 산출물 계약. 이 모델이 프런트엔드 타입까지 만들어 낸다.
    model: type[BaseModel]
    #: pipeline.core.schedule.SCHEDULE_GROUPS 의 키
    schedule: str
    #: 화면의 '원문 ↗' 링크
    source_url: str
    collect: Collector
    #: 값이 없어도 정상인 항목. 되돌리기 대상에서 빼고 stale 로도 세지 않는다.
    #: 예: 표 아래 안내 문구처럼 있으면 좋고 없어도 그만인 것.
    optional: frozenset[str] = frozenset()
    #: 이 수집원에만 필요한 무거운 파이썬 의존성(pyproject 의 optional-dependencies).
    #: 워크플로가 `uv run --extra <이름>` 으로 바꿔 실행한다. 전부 기본 설치하면
    #: OCR 과 무관한 수집까지 onnxruntime 을 내려받게 된다.
    extras: frozenset[str] = frozenset()
    #: 러너에 깔아야 하는 시스템 패키지. 워크플로가 apt-get 단계를 넣는다.
    apt_packages: frozenset[str] = frozenset()
    #: 직전 산출물을 `collect(previous)` 로 넘겨받는다.
    #:
    #: 되돌리기(merge)와는 다른 목적이다. 되돌리기는 "못 모은 값을 메우는" 일이고,
    #: 이쪽은 "이미 만들어 둔 것을 다시 만들지 않는" 일이다 — 질병 사전은 문단마다
    #: 번역이 붙는데, 영문이 그대로면 번역을 재사용해야 매번 17만자를 다시
    #: 번역하지 않는다.
    reuses_previous: bool = False


@dataclass(frozen=True)
class RunOutcome:
    source_id: str
    path: Path
    changed: bool
    stale_fields: list[str]
    #: 수집이 통째로 실패해 이전 값을 그대로 유지한 경우
    fell_back: bool
    message: str


def data_fields(payload: Mapping[str, Any]) -> dict[str, Any]:
    """공통 꼬리표를 뺀 실제 데이터 항목만."""
    return {key: value for key, value in payload.items() if key not in RESERVED_FIELDS}


def run_source(source: Source, data_root: Path) -> RunOutcome:
    """수집원 하나를 실행하고 산출 JSON 을 갱신한다."""
    path = data_root / source.output
    previous = read_previous(path)

    try:
        fresh = source.collect(previous) if source.reuses_previous else source.collect()
    except CollectError as error:
        if previous is None:
            # 처음 수집인데 실패했다. 되돌릴 곳이 없으므로 조용히 넘기지 않는다.
            raise
        # 사이트에 닿지도 못한 경우다. 이전 내용을 통째로 들고 가고,
        # 선택 항목이 아닌 모든 항목을 되돌린 것으로 표시한다.
        kept = data_fields(previous)
        merged = dict(kept)
        stale_fields = sorted(key for key in kept if key not in source.optional)
        message = f"수집 실패, 이전 값 유지 ({error})"
        fell_back = True
    else:
        # 없어도 정상인 항목은 되돌리기에서 빼고 수집한 그대로 넘긴다.
        optional_values = {key: fresh[key] for key in source.optional if key in fresh}
        required = {key: value for key, value in fresh.items() if key not in source.optional}
        merged, stale_fields = merge_with_previous(required, previous)
        merged.update(optional_values)
        message = ""
        fell_back = False

    payload_dict = {
        **merged,
        "collected_at": clock.stamp(),
        "source_url": source.source_url,
        "stale": bool(stale_fields),
        "stale_fields": stale_fields,
    }

    try:
        payload = source.model.model_validate(payload_dict)
    except ValidationError as error:
        raise CollectError(f"[{source.id}] 산출물이 계약과 맞지 않습니다:\n{error}") from error

    changed = write_json(path, payload.model_dump(mode="json"))

    if not message:
        if not changed:
            message = "변경 없음"
        elif stale_fields:
            message = "갱신 (되돌린 항목: " + ", ".join(stale_fields) + ")"
        else:
            message = "갱신"

    return RunOutcome(
        source_id=source.id,
        path=path,
        changed=changed,
        stale_fields=stale_fields,
        fell_back=fell_back,
        message=message,
    )


__all__ = [
    "RESERVED_FIELDS",
    "Collector",
    "RunOutcome",
    "Source",
    "data_fields",
    "run_source",
]
