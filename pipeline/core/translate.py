"""영→한 기계번역.

브라우저에서 번역하지 않는다. 무료 엔드포인트는 호출이 몰리면 IP 단위로 막히고,
그러면 사용자가 화면을 열 때마다 실패해 기능 자체를 못 쓰게 된다. 수집 시점에
번역까지 끝내 결과만 정적 JSON 으로 내려준다.

엔드포인트 하나만 쓰면 그쪽이 막힌 날 번역이 통째로 실패하므로 성격이 다른 둘을
차례로 시도하고, 그래도 안 되면 **원문을 그대로 남긴다**. 번역 실패는 수집 실패가
아니다 — 영문이라도 보이는 편이 빈 화면보다 낫고, 다음 실행이 그 자리만 다시
시도한다(호출자가 원문을 키로 재사용 여부를 판단하기 때문).
"""

from __future__ import annotations

import urllib.parse
from collections.abc import Callable

from pipeline.core.http import Session

Translator = Callable[[Session, str], "str | None"]


def _clients5(session: Session, text: str) -> str | None:
    query = urllib.parse.urlencode({"client": "dict-chrome-ex", "sl": "en", "tl": "ko", "q": text})
    payload = session.get_json(f"https://clients5.google.com/translate_a/t?{query}", timeout=20)
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, str):
            return first
        if isinstance(first, list):
            return "".join(part for part in first if isinstance(part, str))
    return None


def _gtx(session: Session, text: str) -> str | None:
    query = urllib.parse.urlencode({"client": "gtx", "sl": "en", "tl": "ko", "dt": "t", "q": text})
    payload = session.get_json(
        f"https://translate.googleapis.com/translate_a/single?{query}", timeout=20
    )
    return "".join(part[0] for part in payload[0] if part[0])


TRANSLATORS: tuple[Translator, ...] = (_clients5, _gtx)


def translate(session: Session, text: str) -> str | None:
    """영→한. 모두 실패하면 None — 부르는 쪽이 영문을 그대로 둔다."""
    for translator in TRANSLATORS:
        try:
            result = (translator(session, text) or "").strip()
            if result:
                return result
        except Exception:  # noqa: BLE001 - 번역 실패는 수집 실패가 아니다
            continue
    return None


__all__ = ["TRANSLATORS", "Translator", "translate"]
