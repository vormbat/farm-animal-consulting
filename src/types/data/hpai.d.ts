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
 * 집계 대상 기간(일)
 */
export type WindowDays = number;
/**
 * 화면에 적는 출처 이름
 */
export type SourceName = string;
/**
 * 단계 분류 규칙. 화면에 그대로 띄운다
 */
export type LevelRule = string;
/**
 * 신고 건수
 */
export type Total = number;
/**
 * 가금 신고
 */
export type Poultry = number;
/**
 * 야생조류 등 비가금 신고
 */
export type Wild = number;
/**
 * '진행중'으로 신고된 건
 */
export type Ongoing = number;
/**
 * 신고가 있는 국가 수
 */
export type Countries = number;
/**
 * 신고 건수
 */
export type Total1 = number;
/**
 * 가금 신고
 */
export type Poultry1 = number;
/**
 * 야생조류 등 비가금 신고
 */
export type Wild1 = number;
/**
 * '진행중'으로 신고된 건
 */
export type Ongoing1 = number;
/**
 * 신고가 있는 국가 수
 */
export type Countries1 = number;
export type Name = string;
/**
 * 신고가 많은 상위 3개국
 */
export type Top = string[];
/**
 * 신고 많은 순
 */
export type Regions = Region[];
/**
 * 신고 건수
 */
export type Total2 = number;
/**
 * 가금 신고
 */
export type Poultry2 = number;
/**
 * 야생조류 등 비가금 신고
 */
export type Wild2 = number;
/**
 * '진행중'으로 신고된 건
 */
export type Ongoing2 = number;
/**
 * 신고가 있는 국가 수
 */
export type Countries2 = number;
export type Name1 = string;
export type Note = string;
/**
 * 신고 건수
 */
export type Total3 = number;
/**
 * 가금 신고
 */
export type Poultry3 = number;
/**
 * 야생조류 등 비가금 신고
 */
export type Wild3 = number;
/**
 * '진행중'으로 신고된 건
 */
export type Ongoing3 = number;
export type Name2 = string;
/**
 * ISO3 코드. 매칭되지 않으면 빈 문자열
 */
export type Iso = string;
/**
 * WAHIS 자체 지역 구분을 그대로 쓴다
 */
export type Region1 = string;
/**
 * 동아시아-대양주 철새경로 국가인지
 */
export type Eaaf = boolean;
/**
 * 가장 최근 신고일
 */
export type Latest = string | null;
/**
 * 가장 이른 발생 시작일
 */
export type First = string | null;
/**
 * 최근 신고로부터 지난 날
 */
export type DaysSince = number;
export type Level = 'ongoing' | 'recent' | 'quiet';
/**
 * 경로상 국가들. 신고 많은 순
 */
export type CountriesList = Country[];
/**
 * 전체 국가. 신고 많은 순
 */
export type Countries3 = Country[];

/**
 * `data/hpai/latest.json`
 */
export interface Hpai {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  window_days: WindowDays;
  source_name: SourceName;
  level_rule: LevelRule;
  overall: Tally;
  regions: Regions;
  flyway: Flyway;
  /**
   * 국내 신고가 없으면 null
   */
  korea?: Country | null;
  countries: Countries3;
}
/**
 * 여러 국가를 묶은 집계.
 */
export interface Tally {
  total: Total;
  poultry: Poultry;
  wild: Wild;
  ongoing: Ongoing;
  countries: Countries;
}
export interface Region {
  total: Total1;
  poultry: Poultry1;
  wild: Wild1;
  ongoing: Ongoing1;
  countries: Countries1;
  name: Name;
  top: Top;
}
export interface Flyway {
  total: Total2;
  poultry: Poultry2;
  wild: Wild2;
  ongoing: Ongoing2;
  countries: Countries2;
  name: Name1;
  note: Note;
  countries_list: CountriesList;
}
export interface Country {
  total: Total3;
  poultry: Poultry3;
  wild: Wild3;
  ongoing: Ongoing3;
  name: Name2;
  iso: Iso;
  region: Region1;
  eaaf: Eaaf;
  latest?: Latest;
  first?: First;
  days_since: DaysSince;
  level: Level;
}
