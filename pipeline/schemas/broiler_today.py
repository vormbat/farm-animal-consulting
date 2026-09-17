"""대한양계협회 홈페이지 '금일 육계시세'.

축산물품질평가원(다봄) 시세와는 출처가 다른 협회 자체 공시가라
화면에서도 별도 패널로 둔다.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload

Grade = Literal["대", "중", "소", "병아리"]


class BroilerRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grade: Grade = Field(description="규격")
    spec: str | None = Field(default=None, description="규격 설명. 예: 1.6kg이상 (병아리는 없다)")
    unit: str = Field(description="단위. 대·중·소는 원/kg, 병아리는 원/마리")
    today: int | None = Field(default=None, description="금일")
    yesterday: int | None = Field(default=None, description="전일")
    last_month: int | None = Field(default=None, description="전월")
    last_year: int | None = Field(default=None, description="전년")


class BroilerToday(SourcePayload):
    """`data/price/broiler_today.json`"""

    date_label: str = Field(description="표 머리글의 기준일. 예: 09/17")
    rows: list[BroilerRow] = Field(min_length=1, description="규격별 시세")
    note: str | None = Field(default=None, description="표 아래 안내 문구")
