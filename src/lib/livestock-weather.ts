import { AVIAGEN_APPARENT_TEMP, HSI_LEVELS, HYLINE_HSI } from '@/data/heat-stress';

/**
 * 날씨를 가축 관점으로 바꾸는 계산들.
 *
 * 기온·습도 숫자 자체는 농가에 별 뜻이 없다. 같은 30°C 라도 습도에 따라
 * 계사 안 사정이 전혀 다르고, 겨울에는 THI 가 늘 '정상' 으로만 나온다.
 * 그래서 축종별로 쓰이는 판정도구를 각각 옮겨 두고, 어느 것을 언제 쓰는지도
 * 여기에 적어 둔다. 출처는 각 함수 주석에 있다.
 */

export interface Level {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

const CELSIUS_TO_FAHRENHEIT = (celsius: number) => (celsius * 9) / 5 + 32;

/**
 * 온습도지수(THI). USDA/Clemson 공식으로 소·돼지·가금이 같이 쓴다.
 *
 *   THI = T − (0.55 − 0.55 × RH/100) × (T − 58)   [T: °F]
 */
export function calcTHI(tempC: number | null, rh: number | null): number | null {
  if (tempC === null || rh === null) return null;
  const fahrenheit = CELSIUS_TO_FAHRENHEIT(tempC);
  return Math.round(fahrenheit - (0.55 - 0.55 * (rh / 100)) * (fahrenheit - 58));
}

const THI_LEVELS: { below: number; level: Level }[] = [
  { below: 68, level: { label: '정상', color: '#2E7D32', bg: '#E8F5E9', icon: '✅' } },
  { below: 72, level: { label: '경미', color: '#F57F17', bg: '#FFFDE7', icon: '⚠️' } },
  { below: 80, level: { label: '중등도', color: '#E65100', bg: '#FFF3E0', icon: '🔶' } },
  { below: 90, level: { label: '심각', color: '#B71C1C', bg: '#FFEBEE', icon: '🔴' } },
];
const THI_DANGER: Level = { label: '위험', color: '#880000', bg: '#FCE4EC', icon: '🚨' };

export function thiLevel(thi: number | null): Level | null {
  if (thi === null) return null;
  return THI_LEVELS.find((step) => thi < step.below)?.level ?? THI_DANGER;
}

/** 게이지 막대용 0~100. THI 55~100 구간을 편다. */
export function thiPercent(thi: number | null): number {
  if (thi === null) return 0;
  return Math.max(0, Math.min(100, ((thi - 55) / 45) * 100));
}

/**
 * 체감온도(윈드칠). NWS·캐나다 기상청 2001년 공동 공식.
 *
 * THI 는 더위 전용이라 겨울에는 영하 10°C 에서도 '정상' 으로만 나온다.
 * 겨울은 이쪽을 본다. 공식이 **기온 10°C 이하**에서만 유효하다고 정의돼 있어
 * 그 밖에서는 계산하지 않는다 — 없는 값을 지어내는 것보다 낫다.
 */
export function calcWindChill(tempC: number | null, windMs: number | null): number | null {
  if (tempC === null || windMs === null || tempC > 10) return null;
  // 4.8km/h 이하는 공식 적용 대상 밖이라 최솟값으로 고정한다.
  const kmh = Math.max(windMs * 3.6, 4.8);
  const factor = Math.pow(kmh, 0.16);
  return Math.round(13.12 + 0.6215 * tempC - 11.37 * factor + 0.3965 * tempC * factor);
}

export interface ColdLevel extends Level {
  note: string;
}

const COLD_LEVELS: { above: number; level: ColdLevel }[] = [
  {
    above: 0,
    level: {
      label: '약',
      color: '#2E7D32',
      bg: '#E8F5E9',
      icon: '✅',
      note: '평소 사양관리로 대응 가능',
    },
  },
  {
    above: -10,
    level: {
      label: '경미',
      color: '#F57F17',
      bg: '#FFFDE7',
      icon: '⚠️',
      note: '사료섭취 증가 경향 — 급이량 여유 있게',
    },
  },
  {
    above: -20,
    level: {
      label: '중등도',
      color: '#E65100',
      bg: '#FFF3E0',
      icon: '🔶',
      note: '어린 개체·벼슬 동상 위험 — 틈새바람 차단',
    },
  },
];
const COLD_SEVERE: ColdLevel = {
  label: '심각',
  color: '#B71C1C',
  bg: '#FFEBEE',
  icon: '🔴',
  note: '보온·최소환기 균형 재점검, 급수라인 동결 확인',
};

export function windChillLevel(windChill: number | null): ColdLevel | null {
  if (windChill === null) return null;
  return COLD_LEVELS.find((step) => windChill > step.above)?.level ?? COLD_SEVERE;
}

/** 일교차 위험도. 호흡기·CRD 는 절대온도보다 낙차에서 온다. */
export function diurnalLevel(range: number | null): Level | null {
  if (range === null) return null;
  if (range < 8) return { label: '안전', color: '#2E7D32', bg: '#E8F5E9', icon: '✅' };
  if (range < 12) return { label: '주의', color: '#F57F17', bg: '#FFFDE7', icon: '⚠️' };
  return { label: '경보', color: '#B71C1C', bg: '#FFEBEE', icon: '🔴' };
}

/**
 * 습구온도. Stull(2011) 근사식.
 *
 * 쿨링패드는 물을 증발시켜 식히므로 **아무리 좋아도 습구온도 밑으로는 못
 * 내려간다.** 건구온도만 보고는 오늘 패드가 얼마나 도움이 될지 알 수 없다.
 */
export function calcWetBulb(tempC: number | null, rh: number | null): number | null {
  if (tempC === null || rh === null) return null;
  const humidity = Math.max(5, Math.min(99, rh)); // 공식 유효범위
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) +
    Math.atan(tempC + humidity) -
    Math.atan(humidity - 1.676331) +
    0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity) -
    4.686035
  );
}

/** 표 안에서 값의 위치. 범위 밖은 양 끝에 붙인다(외삽하지 않는다). */
function position(axis: number[], value: number): { index: number; fraction: number } {
  if (value <= axis[0]!) return { index: 0, fraction: 0 };
  if (value >= axis[axis.length - 1]!) return { index: axis.length - 2, fraction: 1 };
  for (let k = 0; k < axis.length - 1; k += 1) {
    const low = axis[k]!;
    const high = axis[k + 1]!;
    if (value >= low && value <= high) return { index: k, fraction: (value - low) / (high - low) };
  }
  return { index: 0, fraction: 0 };
}

/**
 * Hy-Line 열스트레스 지수(HSI). 온도×습도 표를 이중 선형보간으로 조회한다.
 *
 * 표 밖은 양 끝 값으로 고정한다 — 매뉴얼이 제시하지 않은 구간을 임의로
 * 늘려 잡지 않기 위해서다.
 * 출처: Hy-Line Technical Update 「Understanding Heat Stress in Layers」 Figure 2.
 */
export function calcHeatStressIndex(tempC: number | null, rh: number | null): number | null {
  if (tempC === null || rh === null) return null;
  const { temps, rhs, grid } = HYLINE_HSI;
  const row = position(temps, tempC);
  const column = position(rhs, rh);

  const at = (r: number, c: number) => grid[r]![c]!;
  const top =
    at(row.index, column.index) +
    (at(row.index, column.index + 1) - at(row.index, column.index)) * column.fraction;
  const bottom =
    at(row.index + 1, column.index) +
    (at(row.index + 1, column.index + 1) - at(row.index + 1, column.index)) * column.fraction;
  return Math.round(top + (bottom - top) * row.fraction);
}

/**
 * HSI 를 들이댈 수 있는 구간인지.
 *
 * 표의 하한은 20°C 다. 그 아래는 열스트레스 판정 범위가 아니라
 * (Hy-Line 이 정의한 적온대는 18~25°C) 저온 관리로 넘어가야 한다.
 */
export function hsiInRange(tempC: number | null): boolean {
  return tempC !== null && tempC >= 20;
}

export type HsiKey = 'comfort' | 'alert' | 'danger' | 'emergency';

export interface HsiLevel {
  key: HsiKey;
  label: string;
  short: string;
  icon: string;
  color: string;
  bg: string;
}

/**
 * Hy-Line 이 규정한 4단계. 경계값(70/76/82)은 원문 그대로다.
 *
 * `min` 이 null 인 칸은 원본의 `-Infinity` 다(JSON 으로 옮기며 null 이 됐다).
 * 아래를 다 흘려보낸 마지막 칸이라는 뜻이라 조건 없이 걸린다.
 */
export function hsiLevel(hsi: number | null): HsiLevel | null {
  if (hsi === null) return null;
  const found = HSI_LEVELS.find((level) => level.min === null || hsi >= level.min);
  return (found ?? HSI_LEVELS[HSI_LEVELS.length - 1]!) as HsiLevel;
}

export interface ApparentTarget {
  /** 체중(g) */
  weight: number;
  label: string;
  /** 오늘 습도에서의 목표 계사온도(°C) */
  target: number;
  /** 습도 50% 표준조건 대비 증감(°C) */
  delta: number;
}

/**
 * 오늘 습도에 맞춘 목표 계사온도.
 *
 * 습도가 높으면 증발로 열을 못 버려 같은 온도라도 더 덥게 느낀다. 표는 상대습도
 * 40/50/60/70% 네 칸뿐이라 그 사이는 선형보간하고, 밖은 끝 값으로 고정한다.
 * 출처: Aviagen 「Ross Broiler Management Handbook 2025」 Table 2.5.
 */
export function apparentTargets(rh: number | null): ApparentTarget[] {
  if (rh === null) return [];
  const axis = AVIAGEN_APPARENT_TEMP.rh;
  const at = position(axis, rh);
  const standard = axis.indexOf(50);

  return AVIAGEN_APPARENT_TEMP.rows.map((row) => {
    const low = row.t[at.index]!;
    const high = row.t[at.index + 1]!;
    const target = low + (high - low) * at.fraction;
    return {
      weight: row.w,
      label: row.label,
      target: Math.round(target * 10) / 10,
      delta: Math.round((target - row.t[standard]!) * 10) / 10,
    };
  });
}

/**
 * 온도에 따른 음수량 배수.
 *
 * Cobb Broiler Management Guide: 20~32°C 는 1°C 당 +6%, 32~38°C 는 1°C 당 +5%.
 */
export function waterTempFactor(tempC: number | null): number {
  const base = 20;
  if (tempC === null || tempC <= base) return 1;
  if (tempC <= 32) return 1 + 0.06 * (tempC - base);
  return (1 + 0.06 * 12) * (1 + 0.05 * Math.min(tempC - 32, 6));
}

/**
 * `1~3일` / `36일~` / `8~17주` 같은 구간 표기를 숫자 범위로.
 *
 * 물결표가 있으면 열린 구간, 없으면 그 값 하나만 가리킨다(`1주령`).
 */
export function parseAgeRange(label: string): [number, number] {
  const numbers = (label.match(/\d+/g) ?? []).map(Number);
  if (numbers.length >= 2) return [numbers[0]!, numbers[1]!];
  if (numbers.length === 1) {
    return label.includes('~') ? [numbers[0]!, Infinity] : [numbers[0]!, numbers[0]!];
  }
  return [0, Infinity];
}

/** 목표온도 표에서 해당 일령·주령의 목표를 찾는다. */
export function targetTempForAge(
  table: { t: number; day?: string; wk?: string }[],
  age: number,
): number | null {
  for (const row of table) {
    const [low, high] = parseAgeRange(row.day ?? row.wk ?? '');
    if (age >= low && age <= high) return row.t;
  }
  return table[table.length - 1]?.t ?? null;
}

/**
 * Hy-Line 습도 보정: 상대습도 60% 초과 시 5%p 당 목표온도 1°C 하향.
 * 육추기에 적용한다.
 */
export function humidityAdjustment(rh: number | null): number {
  if (rh === null || rh <= 60) return 0;
  return Math.floor((rh - 60) / 5);
}

export interface WindLevel extends Level {
  note: string;
}

/**
 * 풍속(m/s, 지상 10m) 구간.
 *
 * 기상청 특보 기준(강풍주의보 11m/s, 경보 14m/s)보다 **낮은 값에서 먼저** 알린다.
 * 유창계사 개폐 커튼과 차광막은 특보가 뜨기 전 풍속에서도 펄럭임으로 파손이
 * 시작되기 때문이다.
 */
const WIND_LEVELS: { below: number; level: WindLevel }[] = [
  {
    below: 4,
    level: {
      label: '약',
      color: '#2E7D32',
      bg: '#E8F5E9',
      icon: '🍃',
      note: '환기·방제 작업에 지장 없음',
    },
  },
  {
    below: 8,
    level: {
      label: '보통',
      color: '#F57F17',
      bg: '#FFFDE7',
      icon: '🌬️',
      note: '유창계사 커튼 고정 상태 점검',
    },
  },
  {
    below: 14,
    level: {
      label: '강함',
      color: '#E65100',
      bg: '#FFF3E0',
      icon: '💨',
      note: '커튼·차광막 파손 위험 — 방제·소독 작업은 미루는 것이 안전',
    },
  },
];
const WIND_SEVERE: WindLevel = {
  label: '매우강함',
  color: '#B71C1C',
  bg: '#FFEBEE',
  icon: '🌪️',
  note: '강풍특보 수준 — 축사 개폐부 결속, 정전 대비 필요',
};

export function windLevel(ms: number | null): WindLevel | null {
  if (ms === null) return null;
  return WIND_LEVELS.find((step) => ms < step.below)?.level ?? WIND_SEVERE;
}
