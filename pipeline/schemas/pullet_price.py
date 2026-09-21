"""대한산란계협회 — 산란계 중추(中雛)가격.

협회가 게시물 한 건을 계속 재사용하면서 **본문 이미지만 매달 갈아 끼운다.**
표가 HTML 이 아니라 그림 안에 있어 OCR 로 읽는다.

그래서 이 산출물은 다른 수집원과 달리 `image_url` 을 함께 담는다.
숫자를 못 믿겠을 때 사람이 원문 그림을 바로 열어 대조할 수 있어야 하고,
파일 이름이 바뀌었는지가 곧 '이번 달 표가 갱신됐는지'의 신호이기 때문이다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload


class PulletYear(BaseModel):
    """한 해의 월별 시세."""

    model_config = ConfigDict(extra="forbid")

    year: int = Field(description="예: 2026")
    months: list[int | None] = Field(
        description="1~12월 값 12개. 아직 안 나온 달은 null", min_length=12, max_length=12
    )
    average: int = Field(
        description=(
            "원문 표에 인쇄된 평균. 값이 있는 달의 산술평균과 맞는지 검산한 뒤에만 실린다."
        )
    )


class PulletPrice(SourcePayload):
    """`data/price/pullet.json`"""

    title: str = Field(description="게시물 제목")
    post_url: str = Field(description="원문 게시물")
    image_url: str = Field(description="표가 그려진 원문 이미지. 화면에서 바로 열 수 있게 한다.")
    unit: str = Field(description="예: 원/마리")
    latest: int = Field(description="값이 있는 가장 최근 달의 시세")
    latest_year: int
    latest_month: int = Field(ge=1, le=12)
    years: list[PulletYear] = Field(description="최신 연도부터 내림차순")
