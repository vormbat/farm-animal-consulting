"""축산물품질평가원 다봄 — 산란계 관련 산지시세.

화면의 '산란계 관련시세' 카드 세 장(계란 산지가격 · 병아리 초생추 · 산란노계)이
이 산출물 하나를 본다. 세 값의 공시 주기가 서로 달라(일/월/주) 어느 하나가
늦거나 빠져도 나머지는 그대로 보여야 하므로, 항목을 따로 두고 되돌리기도
항목 단위로 일어나게 한다.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload

#: 공시 주기. 화면이 '전월 실적(월 공시)' 같은 꼬리말을 고를 때 쓴다.
Period = Literal["day", "week", "month"]


class PricePoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str = Field(description="공시 시점. 일=2026-09-16, 주=그 주 시작일, 월=2026-08")
    value: int | None = Field(default=None, description="값. 공란이면 null")


class PriceSeries(BaseModel):
    """한 항목의 최신값과 이력."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(description="카드 제목. 예: 산란계 병아리(초생추)")
    unit: str = Field(description="예: 원/마리")
    period: Period
    latest: int | None = Field(default=None, description="값이 있는 가장 최근 시점의 값")
    latest_date: str | None = Field(default=None, description="그 시점")
    rows: list[PricePoint] = Field(description="최신순 이력")


class EggPricePoint(BaseModel):
    """계란은 10개들이와 30개들이(판) 값이 따로 공시된다.

    30개 값을 10개 값의 3배로 계산하지 않는 이유는, 원문이 각각 따로 반올림해
    3배와 어긋나기 때문이다(예: 2,098 × 3 = 6,294 이지만 원문은 6,295).
    화면에 원문 그대로 보이는 편이 대조하기 쉽다.
    """

    model_config = ConfigDict(extra="forbid")

    date: str = Field(description="예: 2026-09-16")
    per_10: int | None = Field(default=None, description="10개들이 가격")
    per_30: int | None = Field(default=None, description="30개들이(판) 가격")


class EggPrice(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(description="카드 제목")
    region: str = Field(description="권역. 예: 전국")
    grade: str = Field(description="규격. 예: 특란(XL)")
    latest_date: str | None = Field(default=None)
    latest_per_10: int | None = Field(default=None)
    latest_per_30: int | None = Field(default=None)
    rows: list[EggPricePoint] = Field(description="최신순 이력")


class LayerPrice(SourcePayload):
    """`data/price/layer.json`"""

    egg: EggPrice
    chick: PriceSeries = Field(description="산란계 병아리(초생추) — 월 공시")
    old_hen: PriceSeries = Field(description="산란노계(폐계) — 주 공시")
