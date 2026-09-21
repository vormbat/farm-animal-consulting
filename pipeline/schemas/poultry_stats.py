"""축산물품질평가원 축산유통 통계누리 — 산란계·육계 사육 통계.

통계표 `DT_1EO071` "닭 시도 용도별(산란계,육용계) 사육규모별 가구수 및 마리수".
분기 단위로 공시되고, 이 표 하나에 두 축종의 **농가수와 마리수가 함께** 있다.

값 하나하나보다 "직전 분기 대비 얼마나 늘었나"가 실제로 읽히는 정보라
전 분기 값과 증감률을 같이 담는다. 화면에서 다시 계산하지 않게 하려는 것이다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload


class SpeciesStat(BaseModel):
    """한 축종의 한 지역 수치."""

    model_config = ConfigDict(extra="forbid")

    farms: int | None = Field(default=None, description="사육 가구수")
    birds: int | None = Field(default=None, description="사육 마리수")
    prev_farms: int | None = Field(default=None, description="직전 분기 가구수")
    prev_birds: int | None = Field(default=None, description="직전 분기 마리수")
    farms_pct: float | None = Field(default=None, description="가구수 증감률(%)")
    birds_pct: float | None = Field(default=None, description="마리수 증감률(%)")
    per_farm: int | None = Field(default=None, description="호당 마리수")


class RegionStat(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(description="시도명. 예: 경기")
    layer: SpeciesStat
    broiler: SpeciesStat
    layer_share: float | None = Field(default=None, description="전국 산란계 마리수 중 비중(%)")
    broiler_share: float | None = Field(default=None, description="전국 육계 마리수 중 비중(%)")


class PoultryStats(SourcePayload):
    """`data/price/poultry_stats.json`"""

    period: str = Field(description="사람이 읽는 분기. 예: 2026 2/4")
    period_code: str = Field(description="원문 분기 코드. 예: 202602")
    prev_period: str | None = Field(default=None, description="비교 대상 분기")
    table_name: str = Field(description="원문 통계표 이름")
    layer: SpeciesStat = Field(description="전국 산란계")
    broiler: SpeciesStat = Field(description="전국 육계")
    regions: list[RegionStat] = Field(description="시도별. 사육 실적이 없는 시도는 뺀다.")
