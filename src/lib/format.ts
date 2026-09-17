/**
 * 표시 포맷 모음.
 *
 * 수집 파이프라인과 마찬가지로 화면도 **모든 시각을 KST로 고정**한다.
 * 사용자의 브라우저 시간대에 따라 "수집 2026-09-17 11:44 KST" 가 흔들리면
 * 원본 발표일과 수집 시각을 대조할 수 없기 때문이다.
 */
export const KST_TIME_ZONE = 'Asia/Seoul';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function kstParts(date: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const out: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(date)) out[type] = value;
  return out;
}

/** KST 기준 요일 인덱스(0=일). Intl 의 영문 요일을 쓰지 않고 자체 매핑한다. */
function kstWeekdayIndex(date: Date): number {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    weekday: 'short',
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
}

/** `2026-09-17` */
export function formatKstDate(date: Date | string | number): string {
  const p = kstParts(new Date(date));
  return `${p.year}-${p.month}-${p.day}`;
}

/** `2026-09-17 11:44 KST` — 수집 시각 표기에 쓴다. */
export function formatKstDateTime(date: Date | string | number): string {
  const p = kstParts(new Date(date));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} KST`;
}

/** `9/18(금)` — 헤더 오늘 날짜 표기. */
export function formatKstShortDate(date: Date | string | number = new Date()): string {
  const d = new Date(date);
  const p = kstParts(d);
  const weekday = WEEKDAY_KO[kstWeekdayIndex(d)] ?? '';
  return `${Number(p.month)}/${Number(p.day)}(${weekday})`;
}

/** `78,985,355` */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('ko-KR').format(value);
}

/** `2,095원` */
export function formatWon(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${formatNumber(value)}원`;
}

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface Delta {
  direction: DeltaDirection;
  /** `▲1.6%` 형태의 표시 문자열 */
  label: string;
}

/** 증감률을 `▲1.6%` / `▼0.3%` / `–` 로. 원본 사육 통계 패널이 쓰던 표기를 따른다. */
export function formatDelta(percent: number | null | undefined, digits = 1): Delta {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return { direction: 'flat', label: '–' };
  }
  const rounded = Number(percent.toFixed(digits));
  if (rounded > 0) return { direction: 'up', label: `▲${rounded.toFixed(digits)}%` };
  if (rounded < 0) return { direction: 'down', label: `▼${Math.abs(rounded).toFixed(digits)}%` };
  return { direction: 'flat', label: `${rounded.toFixed(digits)}%` };
}
