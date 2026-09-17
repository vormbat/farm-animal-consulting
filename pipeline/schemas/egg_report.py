"""주간 계란 수급 정보.

농림축산식품부·축산물품질평가원·대한양계협회·식용란선별포장업협회·
한국계란산업협회가 매주 함께 내는 보고서다. 다봄 게시판에 PDF 한 장으로만
올라오므로 텍스트를 뽑아 절 단위로 나눈다.

표(수급강도·재고기간·선별포장 실적)는 담지 않는다. 화면이 보여주는 것은
각 절의 <요약> 문단이고, 숫자 표는 원문에서 보는 편이 정확하기 때문이다.
필요해지면 원문 PDF 링크로 간다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from pipeline.schemas.common import SourcePayload


class ReportBullet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    org: str | None = Field(
        default=None,
        description="말한 기관. 원문의 '- (대한양계협회) …' 괄호 안. 요약 머리글(◆)은 없다.",
    )
    text: str = Field(description="줄바꿈을 이어 붙인 문단")


class ReportSection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: int = Field(description="원문의 절 번호")
    title: str = Field(description="예: 유통 동향")
    bullets: list[ReportBullet] = Field(description="문단 목록. 표뿐인 절은 빈 배열")


class EggReport(SourcePayload):
    """`data/price/egg_report.json`"""

    title: str = Field(description="게시글 제목. 예: 9월 7일 주간 계란 수급 정보(58차)")
    posted_at: str | None = Field(default=None, description="게시일. 예: 2026-09-15")
    post_url: str = Field(description="게시글 주소")
    pdf_url: str | None = Field(default=None, description="첨부 PDF 내려받기 주소")
    issue: str | None = Field(default=None, description="예: 제2026-58호")
    period: str | None = Field(default=None, description="대상 기간. 예: 2026. 9. 7. ~ 9. 13.")
    headline: str | None = Field(default=None, description="생산 동향 절 머리의 한 줄 요약(◆)")
    sections: list[ReportSection] = Field(description="절 목록. 원문 번호 순서")
