/**
 * 사람이 편집하는 데이터.
 *
 * `src/types/data.d.ts` 는 수집 스키마에서 생성되지만, 이 파일은 손으로 쓴다.
 * 여기 있는 것들은 어디서 긁어 오는 값이 아니라 **편집자가 정하는 내용**이라
 * 수집원이 없고 따라서 계약 생성 대상도 아니다.
 *
 * 저장소의 파일을 고쳐 발행한다. 원본처럼 화면에서 토큰으로 커밋하지 않는다
 * (docs/decisions/0001 참고) — 토큰이 브라우저에 남으면 저장소 쓰기 권한이
 * 그대로 넘어간다.
 */

export interface MonthlyPick {
  /** 질병 사전의 슬러그. 사전에 없는 주제면 null 이고 `title` 을 쓴다. */
  slug: string | null;
  /** 왜 이달에 짚었는지 */
  note: string | null;
  /** 사전에 없는 주제를 직접 적은 경우 */
  title?: string;
}

export interface MonthlyPicks {
  /** 누가 고른 것인지. 화면에 그대로 적는다. */
  by: string;
  updated: string;
  note: string;
  /** `2026-09` -> 그달의 선택 */
  picks: Record<string, MonthlyPick[]>;
}

/** 손으로 관리하는 파일의 경로 -> 모양. */
export interface EditorialMap {
  'disease/monthly-picks.json': MonthlyPicks;
}

export type EditorialPath = keyof EditorialMap;
