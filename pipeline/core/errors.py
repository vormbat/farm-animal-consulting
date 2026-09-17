"""수집 실패를 구분하기 위한 예외."""

from __future__ import annotations


class CollectError(Exception):
    """수집 자체가 실패했다. 이전 값이 있으면 그대로 두고 stale 로 표시한다."""


class MissingDataError(CollectError):
    """새로 수집하지도 못했고 이전 값도 없다. 되돌릴 곳이 없으므로 진짜 실패다."""


class ParseError(CollectError):
    """응답은 받았지만 기대한 구조가 아니다. 사이트 개편을 의심할 신호다."""
