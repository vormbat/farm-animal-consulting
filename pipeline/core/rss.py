"""RSS/Atom 피드를 항목 목록으로 읽는다.

매체마다 CMS 가 달라 피드 모양이 제각각이지만, 우리가 쓰는 건 결국
**제목·주소·발행시각** 셋뿐이다. 그 셋을 꺼내는 일을 여기 한 곳에 모은다.

## 날짜가 이 모듈의 존재 이유다

원본은 이 문제로 두 번 데였다. 피드가 주는 시각은 두 종류인데 겉모습만으로는
구분되지 않는다.

  * `Tue, 22 Sep 2026 12:29:02 +0900` — 시간대가 붙어 있다(연합뉴스·데일리벳).
  * `2026-09-22 09:00:00` — 시간대가 없다. 국내 CMS 는 이걸 **KST 로** 쓴다
    (한돈뉴스·축산신문 `dc:date`·농수축산신문·농식품부).

시간대 없는 쪽을 UTC 로 읽으면 기사 시각이 아홉 시간 밀린다. 원본은 매체마다
그때그때 예외를 넣어 막았는데(`parseAflRSS` 의 문자열 자르기), 그러면 매체가
늘 때마다 같은 실수를 다시 할 수 있다. 여기서는 규칙을 한 번만 적는다 —
**시간대 표기가 없으면 KST 로 본다.**

바깥 매체(The Poultry Site 는 `+0100`)는 시간대가 붙어 오므로 이 규칙과
충돌하지 않는다.
"""

from __future__ import annotations

import html as html_module
import re
from dataclasses import dataclass
from datetime import datetime
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree

from pipeline.core.clock import KST
from pipeline.core.errors import ParseError

#: RSS 1.0/2.0 확장. 축산신문은 `pubDate` 가 비어 있고 `dc:date` 에만 날짜가 있다.
DC = "{http://purl.org/dc/elements/1.1/}"
ATOM = "{http://www.w3.org/2005/Atom}"

_TAG = re.compile(r"<[^>]+>")
#: 실체 참조가 아닌 맨 `&`. 연합뉴스가 `media:content` 의 유튜브 주소를
#: `...?v=abc&feature=youtu.be` 그대로 실어 보내 XML 이 깨진다.
_LOOSE_AMP = re.compile(r"&(?!#\d+;|#x[0-9a-fA-F]+;|[A-Za-z][A-Za-z0-9]*;)")
_SPACE = re.compile(r"\s+")
#: `2026-09-22 09:34:36.787` / `2026-09-22T09:34:36` — 시간대 표기가 없는 형식
_NAIVE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?")


@dataclass(frozen=True)
class FeedItem:
    title: str
    url: str
    #: 화면 표기용 `09.22 10:44` (KST). 피드에 날짜가 없으면 빈 문자열.
    date: str
    #: 정렬용 ISO. 날짜가 없으면 None — 정렬에서 뒤로 민다.
    published: datetime | None
    #: 피드 안에서 다시 출처가 갈리는 경우(모아 주는 피드)에만 채운다.
    source: str = ""


def clean(raw: str | None) -> str:
    """태그와 실체 참조를 걷어낸 한 줄."""
    if not raw:
        return ""
    return _SPACE.sub(" ", html_module.unescape(_TAG.sub(" ", raw))).strip()


def parse_time(raw: str | None) -> datetime | None:
    """피드의 발행시각을 KST 로. 읽을 수 없으면 None."""
    if not raw:
        return None
    text = raw.strip()

    naive = _NAIVE.match(text)
    if naive:
        year, month, day, hour, minute, second = naive.groups()
        # 시간대가 없다 = 국내 CMS = KST. 모듈 설명의 규칙.
        return datetime(
            int(year), int(month), int(day), int(hour), int(minute), int(second or 0), tzinfo=KST
        )

    try:
        parsed = parsedate_to_datetime(text)
    except (TypeError, ValueError):
        return None
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=KST)
    return parsed.astimezone(KST)


def label(moment: datetime | None) -> str:
    """`09.22 10:44` — 원본이 쓰던 표기 그대로."""
    return moment.astimezone(KST).strftime("%m.%d %H:%M") if moment else ""


def _text(node: ElementTree.Element, *names: str) -> str | None:
    for name in names:
        found = node.find(name)
        if found is not None and (found.text or "").strip():
            return found.text
    return None


def _link(node: ElementTree.Element) -> str:
    direct = _text(node, "link", f"{ATOM}id", "guid")
    if direct:
        return direct.strip()
    # Atom 은 주소를 본문이 아니라 href 속성에 둔다.
    for anchor in node.findall(f"{ATOM}link"):
        href = anchor.get("href")
        if href and anchor.get("rel", "alternate") == "alternate":
            return href.strip()
    return ""


def parse_feed(xml: str) -> list[FeedItem]:
    """RSS 2.0 · RSS 1.0 · Atom 을 같은 모양으로 읽는다.

    XML 이 아니면 ParseError — 사이트가 점검 페이지를 200 으로 돌려주는 일이 잦아,
    빈 목록으로 넘기면 '기사 없음' 으로 조용히 표시되기 때문이다.
    """
    text = xml.strip()
    try:
        root = ElementTree.fromstring(text)
    except ElementTree.ParseError:
        # 맨 `&` 하나로 피드 전체를 버리지 않는다. 고쳐서 한 번만 더 해 본다.
        try:
            root = ElementTree.fromstring(_LOOSE_AMP.sub("&amp;", text))
        except ElementTree.ParseError as error:
            raise ParseError(f"피드를 XML 로 읽지 못했습니다: {error}") from error

    nodes = root.findall(".//item") or root.findall(f".//{ATOM}entry")
    if not nodes:
        raise ParseError("피드에 항목(item/entry)이 없습니다")

    items: list[FeedItem] = []
    seen: set[str] = set()
    for node in nodes:
        title = clean(_text(node, "title", f"{ATOM}title"))
        url = _link(node)
        if not title or not url or url in seen:
            continue
        seen.add(url)
        raw_time = _text(node, "pubDate", f"{DC}date", f"{ATOM}published", f"{ATOM}updated")
        published = parse_time(raw_time)
        items.append(
            FeedItem(
                title=title,
                # 국내 CMS 는 피드 주소만 http 로 내주는 곳이 있다(한돈뉴스·농식품부).
                url=url.replace("http://", "https://", 1) if url.startswith("http://") else url,
                date=label(published),
                published=published,
            )
        )
    return items


def newest(items: list[FeedItem], limit: int) -> list[FeedItem]:
    """최신순 상위 `limit` 건. 날짜가 없는 항목은 피드 순서를 존중해 뒤에 둔다."""
    dated = [item for item in items if item.published]
    undated = [item for item in items if not item.published]
    dated.sort(key=lambda item: item.published, reverse=True)  # type: ignore[arg-type,return-value]
    return (dated + undated)[:limit]


__all__ = ["FeedItem", "clean", "label", "newest", "parse_feed", "parse_time"]
