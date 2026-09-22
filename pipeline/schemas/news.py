"""뉴스 브리핑 계약.

## 매체 하나가 곧 항목 하나다

되돌리기(`merge_with_previous`)는 **최상위 항목 단위**로 이전 값을 메운다.
그래서 매체를 `outlets: list[...]` 로 묶지 않고 매체마다 최상위 항목을 둔다.
축산신문이 점검 중이어도 나머지 아홉 매체는 새로 채워지고, `stale_fields` 에
`chuksan` 만 남아 화면이 그 카드에만 '갱신 실패' 를 붙일 수 있다.

매체를 하나로 묶었다면 이 되돌리기를 수집원 안에서 다시 구현해야 했을 것이다 —
파이프라인 전체가 반드시 거치게 하려던 바로 그 규칙을.

## 매체를 늘리려면

`pipeline/sources/news.py` 의 `FEEDS` 에 한 줄, 여기에 항목 하나,
`src/features/briefing/outlets.ts` 의 순서 배열에 한 줄. 셋 다 타입 검사를 받는다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload


class NewsItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(description="기사 제목. 해외 매체는 한글 번역")
    url: str = Field(description="원문 주소. 반드시 매체 도메인으로 바로 간다")
    date: str = Field(description="`09.22 10:44` (KST). 피드가 날짜를 안 주면 빈 문자열")
    source: str = Field(default="", description="매체 안에서 출처가 또 갈릴 때만")
    title_en: str | None = Field(
        default=None,
        description="번역 전 원문 제목. 번역이 미심쩍을 때 대조할 수 있게 남긴다.",
    )
    tags: list[str] = Field(
        default_factory=list,
        description="분류 꼬리표. 지금은 해외 기사에 붙는 '질병' 하나뿐이다.",
    )


class NewsOutlet(BaseModel):
    """매체 하나와 그 최신 기사."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    icon: str
    color: str = Field(description="카드 윗줄 색")
    home: str = Field(description="'전체 ↗' 링크가 가는 곳")
    note: str = Field(description="카드 제목 밑 한 줄 — 무엇을 모아 온 매체인지")
    channel: str = Field(description="채널 탭 묶음. livestock/policy/economy/society/world")
    items: list[NewsItem]


class NewsBriefing(SourcePayload):
    """매체 열 곳의 최신 기사."""

    chuksan: NewsOutlet
    aflnews: NewsOutlet
    handon: NewsOutlet
    dailyvet: NewsOutlet
    policy: NewsOutlet
    econ: NewsOutlet
    politics: NewsOutlet
    society: NewsOutlet
    world: NewsOutlet
    overseas: NewsOutlet
