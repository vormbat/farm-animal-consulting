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
 * 사람이 읽는 분기. 예: 2026 2/4
 */
export type Period = string;
/**
 * 원문 분기 코드. 예: 202602
 */
export type PeriodCode = string;
/**
 * 비교 대상 분기
 */
export type PrevPeriod = string | null;
/**
 * 원문 통계표 이름
 */
export type TableName = string;
/**
 * 사육 가구수
 */
export type Farms = number | null;
/**
 * 사육 마리수
 */
export type Birds = number | null;
/**
 * 직전 분기 가구수
 */
export type PrevFarms = number | null;
/**
 * 직전 분기 마리수
 */
export type PrevBirds = number | null;
/**
 * 가구수 증감률(%)
 */
export type FarmsPct = number | null;
/**
 * 마리수 증감률(%)
 */
export type BirdsPct = number | null;
/**
 * 호당 마리수
 */
export type PerFarm = number | null;
/**
 * 시도명. 예: 경기
 */
export type Name = string;
/**
 * 전국 산란계 마리수 중 비중(%)
 */
export type LayerShare = number | null;
/**
 * 전국 육계 마리수 중 비중(%)
 */
export type BroilerShare = number | null;
/**
 * 시도별. 사육 실적이 없는 시도는 뺀다.
 */
export type Regions = RegionStat[];

/**
 * `data/price/poultry_stats.json`
 */
export interface PoultryStats {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  period: Period;
  period_code: PeriodCode;
  prev_period?: PrevPeriod;
  table_name: TableName;
  layer: SpeciesStat;
  broiler: SpeciesStat1;
  regions: Regions;
}
/**
 * 한 축종의 한 지역 수치.
 */
export interface SpeciesStat {
  farms?: Farms;
  birds?: Birds;
  prev_farms?: PrevFarms;
  prev_birds?: PrevBirds;
  farms_pct?: FarmsPct;
  birds_pct?: BirdsPct;
  per_farm?: PerFarm;
}
/**
 * 한 축종의 한 지역 수치.
 */
export interface SpeciesStat1 {
  farms?: Farms;
  birds?: Birds;
  prev_farms?: PrevFarms;
  prev_birds?: PrevBirds;
  farms_pct?: FarmsPct;
  birds_pct?: BirdsPct;
  per_farm?: PerFarm;
}
export interface RegionStat {
  name: Name;
  layer: SpeciesStat2;
  broiler: SpeciesStat2;
  layer_share?: LayerShare;
  broiler_share?: BroilerShare;
}
/**
 * 한 축종의 한 지역 수치.
 */
export interface SpeciesStat2 {
  farms?: Farms;
  birds?: Birds;
  prev_farms?: PrevFarms;
  prev_birds?: PrevBirds;
  farms_pct?: FarmsPct;
  birds_pct?: BirdsPct;
  per_farm?: PerFarm;
}
