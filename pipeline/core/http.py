"""HTTP 요청 — 직접 요청을 먼저 하고, 막히면 공개 프록시로 우회한다.

브라우저가 아니라 여기(CI)에서 우회하는 것이 핵심이다. 원본은 이 일을
브라우저에서 했기 때문에 프록시가 죽으면 사용자 화면의 패널이 통째로 비었다.
수집 단계에서 우회하면 프록시가 죽어도 이전에 커밋해 둔 JSON 이 남아 있어
화면은 `stale` 표시와 함께 계속 값을 보여준다.
"""

from __future__ import annotations

import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Sequence

from pipeline.core.errors import CollectError

DEFAULT_TIMEOUT = 20.0
DEFAULT_RETRIES = 2

# 협회 사이트 몇 곳은 기본 User-Agent 를 막는다.
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}

PROXY_TEMPLATES: tuple[str, ...] = (
    "https://api.codetabs.com/v1/proxy/?quest={url}",
    "https://api.allorigins.win/raw?url={url}",
    "https://corsproxy.io/?url={url}",
)


def _routes(url: str, use_proxies: bool) -> list[str]:
    routes = [url]
    if use_proxies:
        quoted = urllib.parse.quote(url, safe="")
        routes.extend(template.format(url=quoted) for template in PROXY_TEMPLATES)
    return routes


def fetch_bytes(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    retries: int = DEFAULT_RETRIES,
    headers: dict[str, str] | None = None,
    use_proxies: bool = True,
) -> bytes:
    """본문을 바이트로 가져온다. 모든 경로가 실패하면 CollectError."""
    merged_headers = {**DEFAULT_HEADERS, **(headers or {})}
    failures: list[str] = []

    for route in _routes(url, use_proxies):
        for attempt in range(retries + 1):
            try:
                request = urllib.request.Request(route, headers=merged_headers)
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    return response.read()
            except (urllib.error.URLError, TimeoutError, OSError) as error:
                failures.append(f"{route} -> {error}")
                if attempt < retries:
                    # 짧게 쉬었다 재시도. 일시적인 연결 거부가 잦다.
                    time.sleep(1.0 + attempt)

    raise CollectError(f"{url} 을(를) 가져오지 못했습니다:\n  " + "\n  ".join(failures))


def fetch_text(
    url: str,
    *,
    encodings: Sequence[str] = ("utf-8", "euc-kr", "cp949"),
    **kwargs: object,
) -> str:
    """본문을 문자열로. 국내 협회 사이트는 EUC-KR 도 흔해 차례로 시도한다."""
    raw = fetch_bytes(url, **kwargs)  # type: ignore[arg-type]
    for encoding in encodings:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    # 전부 실패하면 깨진 글자를 남기더라도 파싱은 시도해 본다.
    return raw.decode(encodings[0], errors="replace")
