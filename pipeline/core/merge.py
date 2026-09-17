"""부분 실패가 정상 데이터를 지우지 않게 한다.

원본 저장소가 지키던 규약이고, 이 파이프라인에서 가장 중요한 규칙이다.
한 수집원이 여러 값을 모을 때(계란·육계·양돈·한우 같은), 그중 하나가
실패했다고 파일 전체를 비우면 화면의 멀쩡한 카드들까지 같이 사라진다.

실패한 값만 직전 커밋 값으로 되돌리고 `stale_fields` 에 이름을 남긴다.
화면은 그 이름을 보고 해당 카드에만 '갱신 실패' 표시를 붙인다.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from pipeline.core.errors import MissingDataError


def merge_with_previous(
    fresh: Mapping[str, Any],
    previous: Mapping[str, Any] | None,
) -> tuple[dict[str, Any], list[str]]:
    """`fresh` 에서 값이 None 인 항목을 `previous` 로 메운다.

    돌려주는 값은 (합쳐진 내용, 되돌린 항목 이름들).
    새로 못 모았는데 이전 값도 없으면 메울 곳이 없으므로 MissingDataError.
    """
    merged: dict[str, Any] = {}
    stale: list[str] = []
    missing: list[str] = []

    for key, value in fresh.items():
        if value is not None:
            merged[key] = value
            continue
        if previous is not None and previous.get(key) is not None:
            merged[key] = previous[key]
            stale.append(key)
            continue
        missing.append(key)

    if missing:
        raise MissingDataError(
            "새로 수집하지 못했고 되돌릴 이전 값도 없습니다: " + ", ".join(sorted(missing))
        )

    return merged, sorted(stale)
