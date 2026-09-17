/**
 * 이 파일은 `npm run gen:types` 가 만든다. 직접 고치지 않는다.
 *
 * 고칠 곳은 pipeline/schemas/ 의 Pydantic 모델이다.
 * 거기서 바꾼 내용이 JSON Schema 를 거쳐 여기로 내려온다.
 */

/* eslint-disable */

/**
 * 수집 시각. 항상 KST 이고 화면에 그대로 찍힌다. 예: 2026-09-17 11:44 KST
 */
export type CollectedAt = string;
/**
 * 원문 출처. 화면의 '원문 ↗' 링크가 된다.
 */
export type SourceUrl = string;
/**
 * 이번 수집에서 되돌린 항목이 하나라도 있으면 true
 */
export type Stale = boolean;
/**
 * 이전 커밋 값으로 되돌린 항목 이름. 화면은 해당 패널에만 갱신 실패를 표시한다.
 */
export type StaleFields = string[];
/**
 * 표 머리글의 기준일. 예: 09/17
 */
export type DateLabel = string;
/**
 * 규격별 시세
 *
 * @minItems 1
 */
export type Rows = [BroilerRow, ...BroilerRow[]];
/**
 * 규격
 */
export type Grade = '대' | '중' | '소' | '병아리';
/**
 * 규격 설명. 예: 1.6kg이상 (병아리는 없다)
 */
export type Spec = string | null;
/**
 * 단위. 대·중·소는 원/kg, 병아리는 원/마리
 */
export type Unit = string;
/**
 * 금일
 */
export type Today = number | null;
/**
 * 전일
 */
export type Yesterday = number | null;
/**
 * 전월
 */
export type LastMonth = number | null;
/**
 * 전년
 */
export type LastYear = number | null;
/**
 * 표 아래 안내 문구
 */
export type Note = string | null;

/**
 * `data/price/broiler_today.json`
 */
export interface BroilerToday {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  date_label: DateLabel;
  rows: Rows;
  note?: Note;
}
export interface BroilerRow {
  grade: Grade;
  spec?: Spec;
  unit: Unit;
  today?: Today;
  yesterday?: Yesterday;
  last_month?: LastMonth;
  last_year?: LastYear;
}

/** 수집 산출물 경로와 그 내용의 대응. `data/` 기준 상대 경로다. */
export interface DataMap {
  /** 금일 육계시세(대한양계협회) */
  'price/broiler_today.json': BroilerToday;
}

export type DataPath = keyof DataMap;
