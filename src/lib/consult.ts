import { WF_RATIO } from '@/data/heat-stress';
import { waterTempFactor } from './livestock-weather';

/**
 * 품종별 사육표준 조회와 육계 생산지수.
 *
 * 표는 열 이름 없는 숫자 배열이다(`src/data/breeds.ts` 머리말에 열 정의가 있다).
 * 그대로 다루면 `row[3]` 같은 코드가 화면 곳곳에 퍼지므로, 읽는 일을 여기서
 * 끝내고 밖으로는 이름 붙은 값만 내보낸다.
 */

export type SpeciesKey = 'broiler' | 'layer';

/** 축약 표에 없는 일령·주령. 인접한 두 시점 사이를 선형보간한다. */
export interface Lookup<T> {
  value: T;
  /** 표에 그 나이가 그대로 있었는지. 없으면 화면에 '보간값'이라고 밝힌다. */
  interpolated: boolean;
}

function interpolate(rows: number[][], age: number): number[] | null {
  let low: number[] | null = null;
  let high: number[] | null = null;
  for (const row of rows) {
    if (row[0]! <= age && (!low || row[0]! > low[0]!)) low = row;
    if (row[0]! >= age && (!high || row[0]! < high[0]!)) high = row;
  }
  if (!low) return high;
  if (!high) return low;
  if (low[0] === high[0]) return low;

  const fraction = (age - low[0]!) / (high[0]! - low[0]!);
  const out: number[] = [age];
  for (let i = 1; i < low.length; i += 1) {
    const a = low[i];
    const b = high[i];
    out.push(
      a === null || a === undefined || b === null || b === undefined
        ? (null as unknown as number)
        : Math.round((a + (b - a) * fraction) * 10) / 10,
    );
  }
  return out;
}

function rowAt(rows: number[][], age: number): Lookup<number[]> | null {
  const exact = rows.find((row) => row[0] === age);
  if (exact) return { value: exact, interpolated: false };
  const guessed = interpolate(rows, age);
  return guessed ? { value: guessed, interpolated: true } : null;
}

export interface BroilerPoint {
  day: number;
  /** 목표체중(g) */
  weight: number | null;
  /** 일당증체(g) */
  gain: number | null;
  /** 누적 사료섭취(g) */
  cumulativeFeed: number | null;
  /** 누적 FCR */
  fcr: number | null;
  /** 그날 하루 사료섭취(g). 매뉴얼에 없어 누적값 차이로 역산한다. */
  dailyFeed: number | null;
}

export function broilerAt(rows: number[][], day: number): Lookup<BroilerPoint> | null {
  const found = rowAt(rows, day);
  if (!found) return null;
  const [, weight, gain, cumulative, fcr] = found.value;

  // 매뉴얼은 누적 사료섭취만 싣는다. 전날 누적과의 차이가 그날 섭취량이다.
  const yesterday = day > 0 ? rowAt(rows, day - 1)?.value?.[3] : null;
  const dailyFeed =
    cumulative === null || cumulative === undefined
      ? null
      : yesterday === null || yesterday === undefined
        ? cumulative
        : Math.round(cumulative - yesterday);

  return {
    interpolated: found.interpolated,
    value: {
      day,
      weight: weight ?? null,
      gain: gain ?? null,
      cumulativeFeed: cumulative ?? null,
      fcr: fcr ?? null,
      dailyFeed,
    },
  };
}

export type LayerPhase = 'rearing' | 'production';

export interface LayerPoint {
  week: number;
  phase: LayerPhase;
  /** 목표체중(g) */
  weight: number | null;
  /** 사료섭취(g/일) */
  feed: number | null;
  /** 음수섭취(ml/일) */
  water: number | null;
  /** 누적 폐사율(%) */
  mortality: number | null;
  /** 산란율(%). 육성기에는 없다. */
  layRate: number | null;
  /** 평균 난중(g). 육성기에는 없다. */
  eggWeight: number | null;
}

export interface LayerTable {
  rearing: number[][];
  production: number[][];
}

export function layerAt(table: LayerTable, week: number): Lookup<LayerPoint> | null {
  // 품종마다 산란 개시 주령이 달라 숫자를 박지 않는다. 산란기 표의 첫 주령으로 가른다.
  const productionStart = table.production[0]?.[0] ?? Infinity;
  const isRearing = week < productionStart;
  const found = rowAt(isRearing ? table.rearing : table.production, week);
  if (!found) return null;

  const row = found.value;
  const value: LayerPoint = isRearing
    ? {
        week,
        phase: 'rearing',
        weight: row[1] ?? null,
        feed: row[2] ?? null,
        water: row[3] ?? null,
        mortality: row[4] ?? null,
        layRate: null,
        eggWeight: null,
      }
    : {
        week,
        phase: 'production',
        layRate: row[1] ?? null,
        weight: row[2] ?? null,
        feed: row[3] ?? null,
        water: row[4] ?? null,
        eggWeight: row[5] ?? null,
        mortality: row[6] ?? null,
      };

  return { value, interpolated: found.interpolated };
}

export interface WaterRange {
  low: number;
  high: number;
  /** 온도 보정 배수 */
  factor: number;
}

/**
 * 사료섭취량에서 음수량을 환산한다.
 *
 * 육계 매뉴얼은 일령별 음수량 표를 싣지 않아 물:사료 비율로 환산할 수밖에 없다.
 * 산란계 Hy-Line 계열은 주령별 음수량이 실려 있으므로 그 값을 그대로 쓰고,
 * 실리지 않은 품종만 이 환산을 쓴다.
 */
export function waterFromFeed(
  species: SpeciesKey,
  feedG: number | null,
  tempC: number | null = null,
): WaterRange | null {
  const ratio = WF_RATIO[species];
  if (!ratio || feedG === null) return null;
  const factor = waterTempFactor(tempC);
  return { low: feedG * ratio.low * factor, high: feedG * ratio.high * factor, factor };
}

export interface ProductionInput {
  /** 입식마릿수 */
  placed: number;
  /** 출하수수 */
  shipped: number;
  /** 사육일수 */
  days: number;
  /** 총사료섭취량(kg) */
  feedKg: number;
  /** 총중량(kg) */
  totalWeightKg: number;
}

export interface ProductionResult {
  /** 생존율(%) */
  survival: number;
  /** 평균출하체중(kg) */
  avgWeightKg: number;
  /** 일당증체량(g) */
  adg: number;
  /** 사료요구율 */
  fcr: number;
  /** 생산지수 */
  epef: number;
}

/**
 * 육계 생산지수(EPEF, European Production Efficiency Factor).
 *
 *   EPEF = 생존율(%) × 일당증체량(g) ÷ (사료요구율 × 10)
 *
 * 국내외 육계 현장에서 가장 널리 쓰는 종합 지표다. 300 안팎이 평균,
 * 400 이상이면 세계 최상위권으로 본다.
 */
export function productionIndex(input: ProductionInput): ProductionResult | null {
  const { placed, shipped, days, feedKg, totalWeightKg } = input;
  if (placed <= 0 || shipped <= 0 || days <= 0 || totalWeightKg <= 0) return null;

  const survival = (shipped / placed) * 100;
  const avgWeightKg = totalWeightKg / shipped;
  const adg = (avgWeightKg * 1000) / days;
  const fcr = feedKg / totalWeightKg;
  if (fcr <= 0) return null;

  return { survival, avgWeightKg, adg, fcr, epef: (survival * adg) / (fcr * 10) };
}

export interface ProductionGrade {
  label: string;
  color: string;
  bg: string;
  note: string;
}

const GRADES: { atLeast: number; grade: ProductionGrade }[] = [
  {
    atLeast: 400,
    grade: { label: '최우수', color: '#1B7A3E', bg: '#E8F5E9', note: '세계 최상위권 수준' },
  },
  { atLeast: 350, grade: { label: '우수', color: '#2E7D32', bg: '#F1F8E9', note: '상위권 성적' } },
  { atLeast: 300, grade: { label: '양호', color: '#F57F17', bg: '#FFFDE7', note: '평균 이상' } },
  {
    atLeast: 250,
    grade: { label: '보통', color: '#E65100', bg: '#FFF3E0', note: '국내 평균 수준' },
  },
];
const NEEDS_WORK: ProductionGrade = {
  label: '개선 필요',
  color: '#C62828',
  bg: '#FFEBEE',
  note: '평균 이하 — 폐사율·증체·사료효율 점검 필요',
};

export function productionGrade(epef: number): ProductionGrade {
  return GRADES.find((step) => epef >= step.atLeast)?.grade ?? NEEDS_WORK;
}

export interface ReverseInput {
  /** 목표 생산지수 */
  target: number;
  /** 생존율(%) */
  survival: number;
  /** 사육일수 */
  days: number;
  fcr: number;
}

/**
 * 공식을 뒤집어 "이 조건에서 목표 지수를 내려면 하루에 얼마나 키워야 하는가".
 *
 *   ADG = 목표지수 × FCR × 10 ÷ 생존율
 */
export function requiredGain(input: ReverseInput): { adg: number; weightKg: number } | null {
  if (input.survival <= 0) return null;
  const adg = (input.target * input.fcr * 10) / input.survival;
  return { adg, weightKg: (adg * input.days) / 1000 };
}
