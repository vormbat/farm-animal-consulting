"""뉴스 브리핑 — 매체 열 곳의 최신 기사.

## 원본에서 바꾼 것

원본은 이 화면을 **브라우저에서** 공개 CORS 프록시 네 곳을 돌려가며 긁었다.
프록시가 죽으면 카드가 통째로 비었고, 사용자의 IP 로 남의 서버를 두드리는
구조이기도 했다. 여기서는 전부 수집 단계로 옮긴다 — 프록시가 필요 없고,
실패해도 직전 커밋의 기사가 `stale` 표시와 함께 계속 보인다.

### HTML 긁기를 그만뒀다

축산신문·한돈뉴스는 원본이 목록 페이지 HTML 을 파싱했다. 둘 다 RSS 가 있다
(`/data/rss/news.xml`, `/rss/allArticle.xml`). 표 구조는 개편 한 번에 깨지지만
피드는 계약이라 잘 안 깨진다.

### 구글 뉴스를 그만뒀다

원본의 '해외 양계질병' 과 채널 탭은 구글 뉴스 RSS 를 썼는데, 거기서 오는 주소는
`news.google.com/rss/articles/CBMi...` 형태라 **원문으로 풀리지 않는다**(서버에서
리다이렉트를 끝까지 따라가도 구글에 머문다 — 실제로 확인했다). 사용자는 기사 대신
구글 중간 페이지를 보게 된다. 같은 사건을 다룬 서로 다른 매체 기사가 중복으로
올라오는 문제도 있었다.

대신 매체 피드를 직접 읽는다. 해외 양계는 The Poultry Site(질병 사전과 같은 출처),
일반 뉴스는 연합뉴스·아시아경제다. 주소가 곧 기사다.

### 데일리벳 카테고리

원본은 워드프레스 `category_name=prevention-hygiene,industry,animalwelfare` 로
방역·산업·동물복지만 받으려 했지만 그 파라미터는 먹지 않는다 — 전체 피드가
그대로 온다. 그래서 원본 화면의 데일리벳 카드에는 지금도 반려동물 임상·수의대
소식이 섞여 있다.

카테고리 피드(`/category/news/<슬러그>/feed/`)는 제대로 동작한다. 그런데 셋을
실제로 열어 보니 원본이 고른 세 갈래 중 둘은 이 화면과 상관이 없었다.

  * `prevention-hygiene` — AI·구제역·ASF·검역. **양계 농가가 봐야 할 것.**
  * `industry` — 펫푸드·펫테크·동물병원 소프트웨어. 반려동물 산업이다.
  * `animalwelfare` — 유기동물 의료봉사. 역시 반려동물이다.

그래서 방역 하나만 받는다. 셋을 다 받으면 카드 다섯 칸을 반려동물 기사가
차지해 정작 구제역 소식이 밀려난다 — 원본에서 실제로 그렇게 되어 있다.
"""

from __future__ import annotations

import re
import time
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from pipeline.core import rss
from pipeline.core.errors import CollectError
from pipeline.core.http import Session, fetch_text
from pipeline.core.source import Source
from pipeline.core.translate import translate
from pipeline.schemas.news import NewsBriefing

#: 카드마다 보여 줄 기사 수. 원본과 같다.
LIMIT = 5

#: 해외 기사 중 질병·방역을 다루는 것. 화면에서 꼬리표로 표시한다.
DISEASE_WORDS = re.compile(
    r"avian influenza|bird flu|HPAI|H5N\d|newcastle|salmonella|campylobacter|coccidio"
    r"|mycoplasma|biosecur|outbreak|cull|vaccinat|disease|infect",
    re.I,
)


@dataclass(frozen=True)
class Feed:
    """매체 하나. 화면 카드의 생김새까지 여기서 정한다."""

    id: str
    name: str
    icon: str
    color: str
    note: str
    channel: str
    #: 피드 주소. 여럿이면 합쳐서 최신순으로 자른다(데일리벳처럼 카테고리별로
    #: 피드가 나뉜 매체).
    urls: tuple[str, ...]
    #: '전체' 링크가 가는 곳.
    home: str
    #: 제목을 한글로 옮긴다(해외 매체).
    translate_titles: bool = False


FEEDS: tuple[Feed, ...] = (
    Feed(
        id="chuksan",
        name="축산신문",
        icon="📰",
        color="#C62828",
        note="chuksannews.co.kr · 종합",
        channel="livestock",
        urls=("https://www.chuksannews.co.kr/data/rss/news.xml",),
        home="https://www.chuksannews.co.kr/news/section_list_all.html?sec_no=2",
    ),
    Feed(
        id="aflnews",
        name="농수축산신문",
        icon="🌾",
        color="#EF6C00",
        note="aflnews.co.kr · 축산",
        channel="livestock",
        urls=("https://www.aflnews.co.kr/rss/S1N2.xml",),
        home="https://www.aflnews.co.kr/news/articleList.html?sc_section_code=S1N2&view_type=sm",
    ),
    Feed(
        id="handon",
        name="한돈뉴스",
        icon="🐷",
        color="#AD1457",
        note="pignpork.com · 피그앤포크",
        channel="livestock",
        urls=("https://www.pignpork.com/rss/allArticle.xml",),
        home="https://www.pignpork.com/news/articleList.html?sc_section_code=S1N1&view_type=sm",
    ),
    Feed(
        id="dailyvet",
        name="데일리벳",
        icon="🩺",
        color="#5E35B1",
        note="dailyvet.co.kr · 방역·검역",
        channel="livestock",
        # 방역 카테고리만. 이유는 모듈 설명의 '데일리벳 카테고리' 항목에.
        urls=("https://www.dailyvet.co.kr/category/news/prevention-hygiene/feed/",),
        home="https://www.dailyvet.co.kr/category/news/prevention-hygiene",
    ),
    Feed(
        id="policy",
        name="농식품부 축산정책",
        icon="🏛️",
        color="#1B5E20",
        note="mafra.go.kr · 보도자료",
        channel="policy",
        urls=("https://www.mafra.go.kr/bbs/home/792/rssList.do?row=50",),
        home="https://www.mafra.go.kr/home/5109/subview.do",
    ),
    Feed(
        id="econ",
        name="경제동향",
        icon="💹",
        color="#0047A0",
        note="asiae.co.kr · 아시아경제",
        channel="economy",
        urls=("https://view.asiae.co.kr/rss/economy.htm",),
        home="https://www.asiae.co.kr/list/economy",
    ),
    Feed(
        id="politics",
        name="연합뉴스 정치",
        icon="🏛️",
        color="#37474F",
        note="yna.co.kr · 정치",
        channel="society",
        urls=("https://www.yna.co.kr/rss/politics.xml",),
        home="https://www.yna.co.kr/politics/all",
    ),
    Feed(
        id="society",
        name="연합뉴스 사회",
        icon="👥",
        color="#546E7A",
        note="yna.co.kr · 사회",
        channel="society",
        urls=("https://www.yna.co.kr/rss/society.xml",),
        home="https://www.yna.co.kr/society/all",
    ),
    Feed(
        id="world",
        name="연합뉴스 국제",
        icon="🌍",
        color="#4527A0",
        note="yna.co.kr · 국제",
        channel="world",
        urls=("https://www.yna.co.kr/rss/international.xml",),
        home="https://www.yna.co.kr/international/all",
    ),
    Feed(
        id="overseas",
        name="해외 양계",
        icon="🦠",
        color="#00695C",
        note="The Poultry Site · 한글 번역",
        channel="world",
        urls=("https://www.thepoultrysite.com/news.rss",),
        home="https://www.thepoultrysite.com/news",
        translate_titles=True,
    ),
)

#: 화면의 '원문' 링크. 매체가 열 곳이라 대표 한 곳을 정할 수 없어
#: 목록 첫 매체를 쓴다 — 카드마다 자기 '전체' 링크를 따로 갖는다.
SOURCE_URL = FEEDS[0].home


def previous_titles(previous: Mapping[str, Any] | None, outlet_id: str) -> dict[str, str]:
    """직전 산출물의 `원문 제목 -> 번역`. 같은 기사를 다시 번역하지 않는다."""
    outlet = (previous or {}).get(outlet_id)
    if not isinstance(outlet, dict):
        return {}
    known: dict[str, str] = {}
    for row in outlet.get("items", []):
        english, korean = row.get("title_en"), row.get("title")
        # 지난번에도 번역이 실패해 영문을 그대로 뒀다면 재사용이 아니다.
        if english and korean and korean != english:
            known[english] = korean
    return known


def to_rows(
    feed: Feed,
    items: list[rss.FeedItem],
    session: Session | None,
    known: Mapping[str, str],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in items:
        row: dict[str, Any] = {
            "title": item.title,
            "url": item.url,
            "date": item.date,
            "source": item.source,
        }
        if feed.translate_titles:
            row["title_en"] = item.title
            reused = known.get(item.title)
            if reused:
                row["title"] = reused
            else:
                translated = translate(session, item.title) if session else None
                if translated:
                    row["title"] = translated
                    time.sleep(0.4)
                # 번역이 안 되면 영문을 그대로 둔다. 다음 실행이 이 기사만 다시 시도한다.
            if DISEASE_WORDS.search(item.title):
                row["tags"] = ["질병"]
        rows.append(row)
    return rows


def collect_feed(
    feed: Feed,
    session: Session | None,
    previous: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    """매체 하나. 실패하면 None — 되돌리기가 직전 기사를 그대로 살려 둔다."""
    gathered: list[rss.FeedItem] = []
    for url in feed.urls:
        try:
            gathered.extend(rss.parse_feed(fetch_text(url, use_proxies=False)))
        except CollectError as error:
            # 카테고리 하나가 막혀도 나머지로 카드를 채운다. 다만 조용히 넘기지는
            # 않는다 — 어느 매체가 왜 막혔는지가 워크플로 로그에 남아야, 며칠 뒤
            # stale 표시를 보고 원인을 찾을 수 있다.
            print(f"  · {feed.id} 피드 실패 ({url}): {error}")
            continue
    items = rss.newest(gathered, LIMIT)
    if not items:
        print(f"  · {feed.id} 기사 0건 → 이전 기사 유지")
        return None

    return {
        "id": feed.id,
        "name": feed.name,
        "icon": feed.icon,
        "color": feed.color,
        "home": feed.home,
        "note": feed.note,
        "channel": feed.channel,
        "items": to_rows(feed, items, session, previous_titles(previous, feed.id)),
    }


def collect(previous: Mapping[str, Any] | None = None) -> dict[str, Any]:
    session = Session()
    return {feed.id: collect_feed(feed, session, previous) for feed in FEEDS}


SOURCE = Source(
    id="news",
    title="뉴스 브리핑(매체 10곳)",
    output="news/briefing.json",
    model=NewsBriefing,
    schedule="news_3h",
    source_url=SOURCE_URL,
    collect=collect,
    reuses_previous=True,
)
