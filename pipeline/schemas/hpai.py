"""WOAH WAHIS — 고병원성 조류인플루엔자(HPAI) 발생 현황.

**위험도 점수가 아니라 관측된 신고 기록이다.** 전 세계 국가별 위험도를 한 숫자로
내주는 공개 모델은 없다(있는 것은 480MB 입력자료를 요구하는 생태적소모델이라
정적 대시보드가 주기적으로 받아 쓸 수 있는 형태가 아니다). 그래서 점수를
지어내지 않고, 각국이 WOAH 에 공식 신고한 사실을 세 축으로 정리한다.

단계(`level`)도 검증된 모델이 아니라 정해진 규칙으로 분류한 것이라, 그 규칙
문자열(`level_rule`)을 산출물에 담아 화면에 그대로 띄운다.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload

#: 진행중 / 최근신고 / 소강
Level = Literal["ongoing", "recent", "quiet"]


class Counts(BaseModel):
    """신고 건수. WAHIS 가 질병코드로 가금(668)과 비가금(671)을 나눠 받는다."""

    model_config = ConfigDict(extra="forbid")

    total: int = Field(description="신고 건수")
    poultry: int = Field(description="가금 신고")
    wild: int = Field(description="야생조류 등 비가금 신고")
    ongoing: int = Field(description="'진행중'으로 신고된 건")


class Tally(Counts):
    """여러 국가를 묶은 집계."""

    countries: int = Field(description="신고가 있는 국가 수")


class Country(Counts):
    name: str
    iso: str = Field(description="ISO3 코드. 매칭되지 않으면 빈 문자열")
    region: str = Field(description="WAHIS 자체 지역 구분을 그대로 쓴다")
    eaaf: bool = Field(description="동아시아-대양주 철새경로 국가인지")
    latest: str | None = Field(default=None, description="가장 최근 신고일")
    first: str | None = Field(default=None, description="가장 이른 발생 시작일")
    days_since: int = Field(description="최근 신고로부터 지난 날")
    level: Level


class Region(Tally):
    name: str
    top: list[str] = Field(description="신고가 많은 상위 3개국")


class Flyway(Tally):
    name: str
    note: str
    countries_list: list[Country] = Field(description="경로상 국가들. 신고 많은 순")


class Hpai(SourcePayload):
    """`data/hpai/latest.json`"""

    window_days: int = Field(description="집계 대상 기간(일)")
    source_name: str = Field(description="화면에 적는 출처 이름")
    level_rule: str = Field(description="단계 분류 규칙. 화면에 그대로 띄운다")
    overall: Tally
    regions: list[Region] = Field(description="신고 많은 순")
    flyway: Flyway
    korea: Country | None = Field(default=None, description="국내 신고가 없으면 null")
    countries: list[Country] = Field(description="전체 국가. 신고 많은 순")
