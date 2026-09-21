"""HTTP 요청 — 직접 요청을 먼저 하고, 막히면 공개 프록시로 우회한다.

브라우저가 아니라 여기(CI)에서 우회하는 것이 핵심이다. 원본은 이 일을
브라우저에서 했기 때문에 프록시가 죽으면 사용자 화면의 패널이 통째로 비었다.
수집 단계에서 우회하면 프록시가 죽어도 이전에 커밋해 둔 JSON 이 남아 있어
화면은 `stale` 표시와 함께 계속 값을 보여준다.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Sequence
from http.cookiejar import CookieJar
from typing import Any

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


def _decode_json(url: str, raw: bytes) -> Any:
    """응답을 JSON 으로 읽는다.

    이 계열 서버는 조회가 실패해도 200 OK 에 안내 HTML 을 실어 보낸다.
    상태 코드만으로는 성공과 구분되지 않아 본문이 JSON 인지까지 확인한다.
    """
    text = raw.decode("utf-8", errors="replace").lstrip()
    if text[:1] not in "{[":
        raise CollectError(f"{url} 이 JSON 대신 다른 응답을 돌려줬습니다({len(raw)}바이트)")
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise CollectError(f"{url} 응답을 JSON 으로 읽지 못했습니다: {error}") from error


class Session:
    """쿠키를 이어 가며 POST 까지 하는 요청 묶음.

    통계누리(mtrace.go.kr) 같은 KOSIS 계열 OLAP 화면은 조회 페이지를 먼저 GET 해
    세션을 받아야 뒤따르는 POST 가 통한다. `fetch_text` 는 요청마다 독립이라
    쿠키가 이어지지 않아 이 경우를 다룰 수 없다.

    프록시 우회는 여기 없다. POST 와 쿠키를 공개 프록시로 넘기면 세션이 끊기고,
    무엇보다 로그인 성격의 요청을 제3자에게 흘리게 된다.
    """

    def __init__(self, headers: dict[str, str] | None = None) -> None:
        self._headers = {**DEFAULT_HEADERS, **(headers or {})}
        self._opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))

    def _open(
        self,
        url: str,
        *,
        data: bytes | None,
        headers: dict[str, str] | None,
        timeout: float,
        retries: int,
    ) -> bytes:
        merged = {**self._headers, **(headers or {})}
        failures: list[str] = []
        for attempt in range(retries + 1):
            try:
                request = urllib.request.Request(url, data=data, headers=merged)
                with self._opener.open(request, timeout=timeout) as response:
                    return bytes(response.read())
            except (urllib.error.URLError, TimeoutError, OSError) as error:
                failures.append(str(error))
                if attempt < retries:
                    time.sleep(1.0 + attempt)
        raise CollectError(f"{url} 요청 실패:\n  " + "\n  ".join(failures))

    def get(
        self,
        url: str,
        *,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = DEFAULT_RETRIES,
        headers: dict[str, str] | None = None,
    ) -> bytes:
        return self._open(url, data=None, headers=headers, timeout=timeout, retries=retries)

    def get_json(self, url: str, **kwargs: Any) -> Any:
        """JSON 을 기대하는 GET."""
        raw = self.get(url, **kwargs)
        return _decode_json(url, raw)

    def post(
        self,
        url: str,
        form: dict[str, str],
        *,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = DEFAULT_RETRIES,
        headers: dict[str, str] | None = None,
    ) -> bytes:
        body = urllib.parse.urlencode(form, encoding="utf-8").encode("utf-8")
        merged = {"Content-Type": "application/x-www-form-urlencoded", **(headers or {})}
        return self._open(url, data=body, headers=merged, timeout=timeout, retries=retries)

    def post_json(self, url: str, form: dict[str, str], **kwargs: Any) -> Any:
        """JSON 을 기대하는 POST.

        이 계열 서버는 조회가 실패해도 200 OK 에 안내 HTML 을 실어 보낸다.
        상태 코드만으로는 성공과 구분되지 않아 본문이 JSON 인지까지 확인한다.
        """
        return _decode_json(url, self.post(url, form, **kwargs))

    def post_json_body(self, url: str, payload: Any, **kwargs: Any) -> Any:
        """JSON 본문을 보내고 JSON 을 받는 POST.

        `post_json` 은 폼으로 보내고 JSON 을 받는다(통계누리처럼 예전 방식의 화면).
        이쪽은 본문까지 JSON 인 요즘 API 용이다 — WAHIS 가 그렇고, GET 으로
        부르면 400 을 돌려준다.
        """
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        raw = self._open(
            url,
            data=body,
            headers={**headers, **(kwargs.pop("headers", None) or {})},
            timeout=kwargs.pop("timeout", DEFAULT_TIMEOUT),
            retries=kwargs.pop("retries", DEFAULT_RETRIES),
        )
        return _decode_json(url, raw)
