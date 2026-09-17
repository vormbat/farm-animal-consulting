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
 * 카드 제목
 */
export type Label = string;
/**
 * 권역. 예: 전국
 */
export type Region = string;
/**
 * 규격. 예: 특란(XL)
 */
export type Grade = string;
export type LatestDate = string | null;
export type LatestPer10 = number | null;
export type LatestPer30 = number | null;
/**
 * 예: 2026-09-16
 */
export type Date = string;
/**
 * 10개들이 가격
 */
export type Per10 = number | null;
/**
 * 30개들이(판) 가격
 */
export type Per30 = number | null;
/**
 * 최신순 이력
 */
export type Rows = EggPricePoint[];
/**
 * 카드 제목. 예: 산란계 병아리(초생추)
 */
export type Label1 = string;
/**
 * 예: 원/마리
 */
export type Unit = string;
export type Period = 'day' | 'week' | 'month';
/**
 * 값이 있는 가장 최근 시점의 값
 */
export type Latest = number | null;
/**
 * 그 시점
 */
export type LatestDate1 = string | null;
/**
 * 공시 시점. 일=2026-09-16, 주=그 주 시작일, 월=2026-08
 */
export type Date1 = string;
/**
 * 값. 공란이면 null
 */
export type Value = number | null;
/**
 * 최신순 이력
 */
export type Rows1 = PricePoint[];

/**
 * `data/price/layer.json`
 */
export interface LayerPrice {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  egg: EggPrice;
  chick: PriceSeries;
  old_hen: PriceSeries1;
}
export interface EggPrice {
  label: Label;
  region: Region;
  grade: Grade;
  latest_date?: LatestDate;
  latest_per_10?: LatestPer10;
  latest_per_30?: LatestPer30;
  rows?: Rows;
}
/**
 * 계란은 10개들이와 30개들이(판) 값이 따로 공시된다.
 *
 * 30개 값을 10개 값의 3배로 계산하지 않는 이유는, 원문이 각각 따로 반올림해
 * 3배와 어긋나기 때문이다(예: 2,098 × 3 = 6,294 이지만 원문은 6,295).
 * 화면에 원문 그대로 보이는 편이 대조하기 쉽다.
 */
export interface EggPricePoint {
  date: Date;
  per_10?: Per10;
  per_30?: Per30;
}
/**
 * 산란계 병아리(초생추) — 월 공시
 */
export interface PriceSeries {
  label: Label1;
  unit: Unit;
  period: Period;
  latest?: Latest;
  latest_date?: LatestDate1;
  rows?: Rows1;
}
export interface PricePoint {
  date: Date1;
  value?: Value;
}
/**
 * 산란노계(폐계) — 주 공시
 */
export interface PriceSeries1 {
  label: Label1;
  unit: Unit;
  period: Period;
  latest?: Latest;
  latest_date?: LatestDate1;
  rows?: Rows1;
}

/** 수집 산출물 경로와 그 내용의 대응. `data/` 기준 상대 경로다. */
export interface DataMap {
  /** 금일 육계시세(대한양계협회) */
  'price/broiler_today.json': BroilerToday;
  /** 산란계 관련시세(다봄) */
  'price/layer.json': LayerPrice;
}

export type DataPath = keyof DataMap;
