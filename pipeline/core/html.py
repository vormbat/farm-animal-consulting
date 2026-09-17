"""표준 라이브러리만으로 필요한 만큼의 HTML 추출.

BeautifulSoup 을 넣지 않는 이유는, 수집 스크립트마다 필요한 것이
"class 로 표 하나 찾기"와 "class 로 요소 안 글자 꺼내기" 두 가지뿐이라
의존성 하나를 늘릴 값이 없기 때문이다.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser

_WHITESPACE = re.compile(r"\s+")


def normalize(text: str) -> str:
    return _WHITESPACE.sub(" ", text).strip()


def _has_class(attrs: list[tuple[str, str | None]], class_name: str) -> bool:
    return any(key == "class" and value and class_name in value.split() for key, value in attrs)


class _TableParser(HTMLParser):
    """class 가 일치하는 첫 <table> 을 행×셀 문자열로 뽑는다.

    <thead>/<tbody> 구분 없이 <tr> 순서대로 모으고, <th> 와 <td> 를 같은
    셀로 취급한다. 협회 사이트 표는 행 머리글이 <th> 라 이 둘을 나누면
    오히려 열 위치가 밀린다.
    """

    def __init__(self, table_class: str) -> None:
        super().__init__(convert_charrefs=True)
        self._table_class = table_class
        self._depth = 0
        self._done = False
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._done:
            return
        if tag == "table":
            if self._depth > 0:
                self._depth += 1
            elif _has_class(attrs, self._table_class):
                self._depth = 1
            return
        if self._depth == 0:
            return
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th"):
            self._cell = []
        elif tag == "br" and self._cell is not None:
            self._cell.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if self._depth == 0 or self._done:
            return
        if tag == "table":
            self._depth -= 1
            if self._depth == 0:
                self._done = True
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None
        elif tag in ("td", "th") and self._cell is not None:
            if self._row is None:
                self._row = []
            self._row.append(normalize("".join(self._cell)))
            self._cell = None

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


class _ElementTextParser(HTMLParser):
    """class 가 일치하는 첫 요소의 글자를 모은다. <br> 은 ' · ' 로 잇는다."""

    def __init__(self, tag: str, class_name: str) -> None:
        super().__init__(convert_charrefs=True)
        self._tag = tag
        self._class_name = class_name
        self._depth = 0
        self._done = False
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._done:
            return
        if tag == self._tag:
            if self._depth > 0:
                self._depth += 1
            elif _has_class(attrs, self._class_name):
                self._depth = 1
            return
        if self._depth > 0 and tag == "br":
            self._parts.append("\n")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._depth > 0 and tag == "br":
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._depth > 0 and tag == self._tag:
            self._depth -= 1
            if self._depth == 0:
                self._done = True

    def handle_data(self, data: str) -> None:
        if self._depth > 0:
            self._parts.append(data)

    @property
    def text(self) -> str | None:
        if not self._parts:
            return None
        lines = [normalize(line) for line in "".join(self._parts).split("\n")]
        return " · ".join(line for line in lines if line) or None


def find_table_rows(html: str, table_class: str) -> list[list[str]]:
    parser = _TableParser(table_class)
    parser.feed(html)
    return parser.rows


def find_element_text(html: str, tag: str, class_name: str) -> str | None:
    parser = _ElementTextParser(tag, class_name)
    parser.feed(html)
    return parser.text


_NUMBER = re.compile(r"-?[\d,]+")


def parse_int(text: str | None) -> int | None:
    """`1,600` -> 1600. 숫자가 없으면 None (원본 표는 값이 비는 칸이 있다)."""
    if not text:
        return None
    match = _NUMBER.search(text)
    if not match:
        return None
    try:
        return int(match.group().replace(",", ""))
    except ValueError:
        return None
