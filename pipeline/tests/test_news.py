"""뉴스 브리핑 수집 테스트.

번역 자체는 검증하지 않는다(외부 서비스다). 대신 **번역을 재사용하는 규칙**과
**한 매체의 실패가 나머지를 건드리지 않는다**는 두 가지를 짚는다. 둘 다 조용히
깨지는 종류라 — 재사용이 깨지면 세 시간마다 같은 제목을 다시 번역하고,
격리가 깨지면 축산신문 점검 한 번에 뉴스 탭 전체가 빈다.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from pipeline.core import rss
from pipeline.core.errors import CollectError
from pipeline.schemas.news import NewsBriefing
from pipeline.sources import news
from pipeline.sources.news import DISEASE_WORDS, FEEDS, Feed, collect_feed, previous_titles, to_rows

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"

OVERSEAS = next(feed for feed in FEEDS if feed.translate_titles)
DOMESTIC = next(feed for feed in FEEDS if not feed.translate_titles)


def fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def item(title: str, url: str = "https://a.test/1") -> rss.FeedItem:
    return rss.FeedItem(title, url, "09.22 09:00", rss.parse_time("2026-09-22 09:00"))


# ── 매체 표 ───────────────────────────────────────────────────────────────


def test_매체_id_와_스키마_항목이_일치한다():
    """둘이 어긋나면 수집은 성공하는데 계약 검증에서 떨어진다."""
    declared = set(NewsBriefing.model_fields) - set(
        NewsBriefing.model_fields.keys()
        & {
            "collected_at",
            "source_url",
            "stale",
            "stale_fields",
        }
    )
    assert {feed.id for feed in FEEDS} == declared


def test_매체마다_채널이_정해져_있다():
    known = {"livestock", "policy", "economy", "society", "world"}
    assert {feed.channel for feed in FEEDS} <= known
    assert all(feed.urls and feed.home for feed in FEEDS)


def test_구글_뉴스를_쓰지_않는다():
    """구글 뉴스 주소는 원문으로 풀리지 않아 사용자가 기사를 못 본다."""
    assert not any("news.google.com" in url for feed in FEEDS for url in feed.urls)


# ── 번역 재사용 ───────────────────────────────────────────────────────────


def test_영문이_같으면_지난_번역을_다시_쓴다():
    previous = {
        "overseas": {
            "items": [{"title": "필리핀 닭고기 생산량 증가", "title_en": "Philippines chicken up"}]
        }
    }
    known = previous_titles(previous, "overseas")
    rows = to_rows(OVERSEAS, [item("Philippines chicken up")], session=None, known=known)
    assert rows[0]["title"] == "필리핀 닭고기 생산량 증가"
    assert rows[0]["title_en"] == "Philippines chicken up"


def test_지난번에_번역이_실패했으면_재사용이_아니다():
    """영문이 그대로 남아 있던 항목은 다음 실행이 다시 시도해야 한다."""
    previous = {"overseas": {"items": [{"title": "Same text", "title_en": "Same text"}]}}
    assert previous_titles(previous, "overseas") == {}


def test_이전_산출물이_없어도_괜찮다():
    assert previous_titles(None, "overseas") == {}
    assert previous_titles({}, "overseas") == {}
    assert previous_titles({"overseas": None}, "overseas") == {}


def test_번역을_못_하면_영문을_그대로_둔다():
    rows = to_rows(OVERSEAS, [item("Bird flu hits Japan")], session=None, known={})
    assert rows[0]["title"] == "Bird flu hits Japan"
    assert rows[0]["title_en"] == "Bird flu hits Japan"


def test_국내_매체는_번역_항목을_달지_않는다():
    rows = to_rows(DOMESTIC, [item("구제역 확산")], session=None, known={})
    assert "title_en" not in rows[0]
    assert "tags" not in rows[0]


# ── 질병 꼬리표 ───────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "title",
    [
        "Bird flu confirmed in commercial flock",
        "Canada launches HPAI vaccination field trial",
        "Belgian egg farm salmonella outbreak infects 306 people",
        "H5N1 detected in wild birds",
    ],
)
def test_질병_기사에_꼬리표를_단다(title: str):
    assert to_rows(OVERSEAS, [item(title)], session=None, known={})[0]["tags"] == ["질병"]


@pytest.mark.parametrize(
    "title",
    [
        "Philippines' chicken consumption set to rise 8.6% in 2027",
        "Brazilian chicken meat exports jump 24.8% in August",
    ],
)
def test_시황_기사에는_꼬리표가_없다(title: str):
    assert "tags" not in to_rows(OVERSEAS, [item(title)], session=None, known={})[0]


def test_질병_낱말은_대소문자를_가리지_않는다():
    assert DISEASE_WORDS.search("newcastle disease")
    assert DISEASE_WORDS.search("NEWCASTLE DISEASE")


# ── 매체 하나의 실패 ──────────────────────────────────────────────────────


def test_피드를_못_받으면_None(monkeypatch: pytest.MonkeyPatch):
    """None 은 되돌리기에게 '이전 기사를 그대로 두라' 는 신호다."""

    def 실패(url: str, **kwargs: Any) -> str:
        raise CollectError("연결 거부")

    monkeypatch.setattr(news, "fetch_text", 실패)
    assert collect_feed(DOMESTIC, session=None, previous=None) is None


def test_카테고리_하나가_막혀도_나머지로_채운다(monkeypatch: pytest.MonkeyPatch):
    feed = Feed(
        id="t",
        name="시험",
        icon="🧪",
        color="#000",
        note="",
        channel="livestock",
        urls=("https://a.test/broken", "https://a.test/ok"),
        home="https://a.test",
    )

    def 골라서(url: str, **kwargs: Any) -> str:
        if url.endswith("broken"):
            raise CollectError("점검 중")
        return fixture("rss_chuksan.xml")

    monkeypatch.setattr(news, "fetch_text", 골라서)
    outlet = collect_feed(feed, session=None, previous=None)
    assert outlet is not None
    assert len(outlet["items"]) == 4


def test_기사가_하나도_없으면_None(monkeypatch: pytest.MonkeyPatch):
    empty = '<?xml version="1.0"?><rss version="2.0"><channel><item></item></channel></rss>'
    monkeypatch.setattr(news, "fetch_text", lambda url, **kwargs: empty)
    assert collect_feed(DOMESTIC, session=None, previous=None) is None


def test_카드_하나는_다섯_건까지(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        news, "fetch_text", lambda url, **kwargs: fixture("rss_thepoultrysite_news.xml")
    )
    outlet = collect_feed(DOMESTIC, session=None, previous=None)
    assert outlet is not None
    assert len(outlet["items"]) == news.LIMIT


def test_카드는_화면에_필요한_것을_모두_들고_있다(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(news, "fetch_text", lambda url, **kwargs: fixture("rss_chuksan.xml"))
    outlet = collect_feed(DOMESTIC, session=None, previous=None)
    assert outlet is not None
    assert outlet["id"] == DOMESTIC.id
    assert outlet["home"] == DOMESTIC.home
    assert outlet["channel"] == DOMESTIC.channel
    assert all(row["title"] and row["url"] for row in outlet["items"])
