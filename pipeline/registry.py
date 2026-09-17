"""`pipeline/sources/` 를 훑어 등록된 수집원을 모은다.

파일을 만들면 등록되고, 지우면 빠진다. 중앙 목록을 따로 유지하지 않는다.
"""

from __future__ import annotations

import importlib
import pkgutil
from functools import cache

from pipeline import sources
from pipeline.core.schedule import get_group
from pipeline.core.source import Source


@cache
def all_sources() -> tuple[Source, ...]:
    found: list[Source] = []
    for module_info in pkgutil.iter_modules(sources.__path__):
        module = importlib.import_module(f"{sources.__name__}.{module_info.name}")
        source = getattr(module, "SOURCE", None)
        if source is None:
            continue
        if not isinstance(source, Source):
            raise TypeError(f"{module.__name__}.SOURCE 는 Source 여야 합니다")
        # 주기 그룹 이름이 틀렸다면 워크플로 생성 때가 아니라 지금 알아채는 편이 낫다.
        get_group(source.schedule)
        found.append(source)

    ids = [source.id for source in found]
    duplicates = {name for name in ids if ids.count(name) > 1}
    if duplicates:
        raise ValueError(f"수집원 id 가 겹칩니다: {', '.join(sorted(duplicates))}")

    return tuple(sorted(found, key=lambda source: source.id))


def get_source(source_id: str) -> Source:
    for source in all_sources():
        if source.id == source_id:
            return source
    known = ", ".join(source.id for source in all_sources())
    raise KeyError(f"모르는 수집원 '{source_id}'. 등록된 수집원: {known}")


def sources_in_group(group_id: str) -> tuple[Source, ...]:
    return tuple(source for source in all_sources() if source.schedule == group_id)
