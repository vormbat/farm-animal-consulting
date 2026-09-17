"""산출 JSON 읽기·쓰기.

쓰기는 임시 파일에 먼저 쓰고 교체한다. 워크플로가 중간에 끊겨
반쯤 쓰인 JSON 이 커밋되면 화면 전체가 파싱 오류로 멈추기 때문이다.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

# 커밋 diff 를 사람이 읽을 수 있게 들여쓰기를 유지한다.
_DUMP_KWARGS: dict[str, Any] = {"ensure_ascii": False, "indent": 2, "sort_keys": False}


def read_previous(path: Path) -> dict[str, Any] | None:
    """직전 커밋 값. 없거나 깨져 있으면 None (수집을 막지는 않는다)."""
    if not path.exists():
        return None
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return loaded if isinstance(loaded, dict) else None


def serialize(payload: dict[str, Any]) -> str:
    return json.dumps(payload, **_DUMP_KWARGS) + "\n"


def write_json(path: Path, payload: dict[str, Any]) -> bool:
    """원자적으로 쓴다. 내용이 이전과 같으면 쓰지 않고 False."""
    text = serialize(payload)

    if path.exists():
        try:
            if path.read_text(encoding="utf-8") == text:
                return False
        except OSError:
            pass

    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise
    return True
