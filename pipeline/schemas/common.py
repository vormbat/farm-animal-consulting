"""모든 산출 JSON 이 공유하는 꼬리표.

Pydantic 모델이 데이터 계약의 단일 진실원이다. 여기서 모델을 고치면
`pipeline gen-schemas` → `node scripts/gen-types.mjs` 를 거쳐
프런트엔드 타입(`src/types/data.d.ts`)까지 따라온다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class SourcePayload(BaseModel):
    """수집 산출물의 공통 필드."""

    model_config = ConfigDict(extra="forbid")

    collected_at: str = Field(
        description="수집 시각. 항상 KST 이고 화면에 그대로 찍힌다. 예: 2026-09-17 11:44 KST"
    )
    source_url: str = Field(description="원문 출처. 화면의 '원문 ↗' 링크가 된다.")
    stale: bool = Field(
        default=False,
        description="이번 수집에서 되돌린 항목이 하나라도 있으면 true",
    )
    stale_fields: list[str] = Field(
        default_factory=list,
        description="이전 커밋 값으로 되돌린 항목 이름. 화면은 해당 패널에만 갱신 실패를 표시한다.",
    )
