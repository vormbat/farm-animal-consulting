import { SOLAR_TERMS } from '@/data/solar-terms';

/**
 * 24절기 계산.
 *
 * 절기는 달력에 박힌 날짜가 아니라 **태양의 황경(黃經)이 15°씩 지나는 순간**이다.
 * 그래서 해마다 하루씩 밀린다. 날짜표를 코드에 넣어 두면 몇 해 지나 조용히
 * 틀리므로, 황경만 저장해 두고(`src/data/solar-terms.ts`) 그때그때 계산한다.
 *
 * 계산은 Meeus 의 태양 위치 근사식이다. 오차가 0.01° 남짓이라 시각으로는 몇 분
 * 수준이고, 날짜를 가리는 데에는 충분하다.
 */

export interface SolarTerm {
  /** 이 절기가 시작되는 태양 황경(도) */
  deg: number;
  name: string;
  hanja: string;
  /** 유래·풍속 */
  story: string;
  /** 이 절기의 가축사육 */
  farm: string;
}

export interface SolarTermMoment {
  term: SolarTerm;
  /** 그 절기가 시작된(또는 시작될) 순간 */
  at: Date;
}

export interface SolarTermInfo {
  current: SolarTermMoment;
  next: SolarTermMoment;
}

const DAY = 86_400_000;
const TERM_STEP = 15;

/** 율리우스일 */
function julianDay(date: Date): number {
  return date.getTime() / DAY + 2440587.5;
}

/** 태양 겉보기 황경(도) */
export function sunLongitude(date: Date): number {
  const t = (julianDay(date) - 2451545.0) / 36525.0;
  const meanLongitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const meanAnomaly = ((357.52911 + 35999.05029 * t - 0.0001537 * t * t) * Math.PI) / 180;
  const equationOfCenter =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(meanAnomaly) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnomaly) +
    0.000289 * Math.sin(3 * meanAnomaly);
  // 장동(nutation)과 광행차 보정.
  const omega = ((125.04 - 1934.136 * t) * Math.PI) / 180;
  const apparent = meanLongitude + equationOfCenter - 0.00569 - 0.00478 * Math.sin(omega);
  return ((apparent % 360) + 360) % 360;
}

/**
 * 황경이 `targetDeg` 를 지나는 순간을 [a, b] 구간에서 이분법으로 좁힌다.
 *
 * 황경은 360° 에서 0° 로 돌아오므로 단순 뺄셈으로는 대소를 못 가린다.
 * ±180° 안으로 접어 부호를 본다.
 */
function bisect(targetDeg: number, from: Date, to: Date): Date {
  const signedGap = (at: Date) =>
    ((((sunLongitude(at) - targetDeg + 180) % 360) + 360) % 360) - 180;

  let low = from.getTime();
  let high = to.getTime();
  // 48회면 20일 구간이 밀리초 아래로 좁혀진다.
  for (let step = 0; step < 48; step += 1) {
    const middle = new Date((low + high) / 2);
    if (signedGap(middle) < 0) low = middle.getTime();
    else high = middle.getTime();
  }
  return new Date(high);
}

function termAt(deg: number): SolarTerm {
  const found = SOLAR_TERMS.find((term) => term.deg === deg);
  // 24개가 15° 간격으로 빠짐없이 있으므로 여기 오지 않는다.
  if (!found) throw new Error(`황경 ${deg}° 에 해당하는 절기가 없습니다`);
  return found;
}

/**
 * 기준 시각이 속한 절기와 다음 절기.
 *
 * 24개를 전부 뒤지지 않는다. 지금 황경으로 어느 칸인지 바로 정한 뒤
 * 그 칸의 시작과 끝 경계만 이분법으로 찾는다.
 */
export function solarTermInfo(now: Date = new Date()): SolarTermInfo {
  const longitude = sunLongitude(now);
  const currentDeg = Math.floor(longitude / TERM_STEP) * TERM_STEP;
  const nextDeg = (currentDeg + TERM_STEP) % 360;

  return {
    // 한 절기는 15~16일이라 20일 구간이면 경계를 확실히 품는다.
    current: {
      term: termAt(currentDeg),
      at: bisect(currentDeg, new Date(now.getTime() - 20 * DAY), now),
    },
    next: { term: termAt(nextDeg), at: bisect(nextDeg, now, new Date(now.getTime() + 20 * DAY)) },
  };
}

/** 현재 절기가 시작된 지 며칠째인지(시작일 당일이 0일째) */
export function daysSince(moment: SolarTermMoment, now: Date = new Date()): number {
  return Math.floor((now.getTime() - moment.at.getTime()) / DAY);
}

/** 다음 절기까지 남은 날 */
export function daysUntil(moment: SolarTermMoment, now: Date = new Date()): number {
  return Math.ceil((moment.at.getTime() - now.getTime()) / DAY);
}

/** 현재 절기 구간에서 지금이 몇 %쯤인지. 진행 막대에 쓴다. */
export function progressPercent(info: SolarTermInfo, now: Date = new Date()): number {
  const span = info.next.at.getTime() - info.current.at.getTime();
  if (span <= 0) return 0;
  const passed = now.getTime() - info.current.at.getTime();
  return Math.max(0, Math.min(100, (passed / span) * 100));
}
