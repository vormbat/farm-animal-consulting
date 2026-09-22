"""공용 RSS 파서 테스트.

여기서 가장 중요한 건 **날짜**다. 피드가 주는 시각은 시간대가 붙은 것과 붙지
않은 것 두 종류인데, 붙지 않은 쪽을 UTC 로 읽으면 기사 시각이 아홉 시간 밀린다.
원본이 이 문제로 매체마다 예외를 넣어야 했던 자리라 규칙을 테스트로 못 박는다.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree

import pytest

from pipeline.core import rss
from pipeline.core.clock import KST
from pipeline.core.errors import ParseError

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


def fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


# ── 날짜 ──────────────────────────────────────────────────────────────────


def test_시간대_없는_시각은_KST_로_읽는다():
    """국내 CMS 규약. UTC 로 읽으면 아홉 시간 밀린다."""
    moment = rss.parse_time("2026-09-22 09:00:00")
    assert moment == datetime(2026, 9, 22, 9, 0, tzinfo=KST)
    assert rss.label(moment) == "09.22 09:00"


def test_밀리초가_붙어도_읽는다():
    """농식품부 피드는 `2026-09-22 09:34:36.787` 로 준다."""
    assert rss.parse_time("2026-09-22 09:34:36.787") == datetime(2026, 9, 22, 9, 34, 36, tzinfo=KST)


def test_T_구분자도_읽는다():
    assert rss.parse_time("2026-09-22T09:34") == datetime(2026, 9, 22, 9, 34, tzinfo=KST)


def test_시간대가_붙어_있으면_그대로_KST_로_환산한다():
    # +0100 인 The Poultry Site 는 KST 로 여덟 시간 앞선다.
    assert rss.label(rss.parse_time("Tue, 22 Sep 2026 00:00:00 +0100")) == "09.22 08:00"
    # 이미 +0900 이면 그대로.
    assert rss.label(rss.parse_time("Tue, 22 Sep 2026 12:29:02 +0900")) == "09.22 12:29"
    # UTC 표기.
    assert rss.label(rss.parse_time("Mon, 21 Sep 2026 07:06:59 +0000")) == "09.21 16:06"


def test_날짜를_못_읽으면_None():
    assert rss.parse_time(None) is None
    assert rss.parse_time("") is None
    assert rss.parse_time("어제") is None
    assert rss.label(None) == ""


# ── 피드 읽기 ─────────────────────────────────────────────────────────────


def test_dc_date_만_있는_피드도_날짜를_찾는다():
    """축산신문은 pubDate 를 비워 두고 dc:date 에만 날짜를 넣는다."""
    items = rss.parse_feed(fixture("rss_chuksan.xml"))
    assert len(items) == 4
    assert all(item.published is not None for item in items)
    assert all(item.date for item in items)
    assert items[0].url.startswith("https://www.chuksannews.co.kr/news/article.html?no=")


def test_맨_앰퍼샌드로_깨진_피드를_살려_낸다():
    """연합뉴스는 유튜브 주소를 그대로 실어 보내 XML 이 깨진다.

    한 항목의 속성 하나 때문에 국제뉴스 카드 전체를 버리지 않는다.
    """
    raw = fixture("rss_yna_international.xml")
    # 픽스처가 정말 깨진 XML 인지부터 확인한다 — 아니면 이 테스트는 아무것도 안 지킨다.
    with pytest.raises(ElementTree.ParseError):
        ElementTree.fromstring(raw)

    items = rss.parse_feed(raw)
    assert len(items) == 4
    assert all(item.title and item.url for item in items)


def test_http_주소는_https_로_올린다():
    """한돈뉴스·농식품부는 피드에 http 주소를 담아 준다."""
    items = rss.parse_feed(fixture("rss_handon.xml"))
    assert items, "픽스처에 항목이 있어야 한다"
    assert all(item.url.startswith("https://") for item in items)


def test_XML_이_아니면_ParseError():
    """점검 페이지를 200 으로 돌려주는 사이트가 있다. 빈 목록으로 조용히 넘기지 않는다."""
    with pytest.raises(ParseError):
        rss.parse_feed("<html><body>점검 중입니다</body></html>")


def test_항목이_없으면_ParseError():
    with pytest.raises(ParseError):
        rss.parse_feed('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>')


def test_같은_주소는_한_번만():
    xml = """<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>가</title><link>https://a.test/1</link></item>
      <item><title>가 (중복)</title><link>https://a.test/1</link></item>
      <item><title>나</title><link>https://a.test/2</link></item>
    </channel></rss>"""
    assert [item.title for item in rss.parse_feed(xml)] == ["가", "나"]


def test_제목의_태그와_실체참조를_걷어낸다():
    xml = """<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>&lt;b&gt;구제역&lt;/b&gt;   확산 &amp;amp; 대응</title>
      <link>https://a.test/1</link></item>
    </channel></rss>"""
    assert rss.parse_feed(xml)[0].title == "구제역 확산 & 대응"


def test_Atom_도_읽는다():
    xml = """<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>제목</title>
        <link rel="alternate" href="https://a.test/1"/>
        <published>2026-09-22T09:00:00</published>
      </entry>
    </feed>"""
    (item,) = rss.parse_feed(xml)
    assert item.title == "제목"
    assert item.url == "https://a.test/1"
    assert item.date == "09.22 09:00"


# ── 정렬 ──────────────────────────────────────────────────────────────────


def test_최신순으로_자르고_날짜없는_항목은_뒤로():
    items = [
        rss.FeedItem("옛날", "https://a.test/1", "", rss.parse_time("2026-09-01 10:00")),
        rss.FeedItem("날짜없음", "https://a.test/2", "", None),
        rss.FeedItem("최신", "https://a.test/3", "", rss.parse_time("2026-09-22 10:00")),
    ]
    assert [item.title for item in rss.newest(items, 3)] == ["최신", "옛날", "날짜없음"]
    assert [item.title for item in rss.newest(items, 1)] == ["최신"]
