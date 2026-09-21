"""The Poultry Site — 양계질병 사전.

영문 원문을 **수집 시점에 미리 번역해** 담는다. 브라우저에서 그때그때 번역하지
않는 이유는 무료 번역 엔드포인트가 호출이 몰리면 IP 단위로 막히기 때문이다.
사용자가 검색할 때마다 실패하면 기능 자체를 못 쓰게 된다.

문단은 영문과 한글을 **짝으로** 담는다. 한글만 남기면 다음 수집 때 "이 문단이
그대로인가"를 판정할 길이 없어 매번 17만자를 다시 번역하게 된다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload


class Paragraph(BaseModel):
    """본문 한 문단."""

    model_config = ConfigDict(extra="forbid")

    en: str = Field(description="영문 원문. 다음 수집에서 번역 재사용 판정에 쓴다.")
    ko: str = Field(description="한글. 번역에 실패하면 영문이 그대로 들어온다.")
    image: str | None = Field(default=None, description="이 문단에 붙은 원문 사진. 없으면 null")


class Disease(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="원문 사이트의 문서 번호")
    slug: str = Field(description="원문 URL 슬러그. 사이트 제목이 바뀌어도 이건 그대로다.")
    url: str = Field(description="원문 문서")
    title_en: str
    title_ko: str = Field(description="표제어. 현장 병명이 있으면 그쪽을 쓴다.")
    aliases: list[str] = Field(
        description="현장에서 쓰는 다른 이름. 검색에 함께 걸린다(예: 감보로, IBD)."
    )
    paragraphs: list[Paragraph]


class DiseaseBook(SourcePayload):
    """`data/disease/diseases.json`"""

    note: str = Field(description="화면 아래에 그대로 띄우는 주의 문구")
    count: int
    diseases: list[Disease]
