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
 * 게시물 제목
 */
export type Title = string;
/**
 * 원문 게시물
 */
export type PostUrl = string;
/**
 * 표가 그려진 원문 이미지. 화면에서 바로 열 수 있게 한다.
 */
export type ImageUrl = string;
/**
 * 예: 원/마리
 */
export type Unit = string;
/**
 * 값이 있는 가장 최근 달의 시세
 */
export type Latest = number;
export type LatestYear = number;
export type LatestMonth = number;
/**
 * 예: 2026
 */
export type Year = number;
/**
 * 1~12월 값 12개. 아직 안 나온 달은 null
 *
 * @minItems 12
 * @maxItems 12
 */
export type Months = [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null
];
/**
 * 원문 표에 인쇄된 평균. 값이 있는 달의 산술평균과 맞는지 검산한 뒤에만 실린다.
 */
export type Average = number;
/**
 * 최신 연도부터 내림차순
 */
export type Years = PulletYear[];

/**
 * `data/price/pullet.json`
 */
export interface PulletPrice {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  title: Title;
  post_url: PostUrl;
  image_url: ImageUrl;
  unit: Unit;
  latest: Latest;
  latest_year: LatestYear;
  latest_month: LatestMonth;
  years: Years;
}
/**
 * 한 해의 월별 시세.
 */
export interface PulletYear {
  year: Year;
  months: Months;
  average: Average;
}
