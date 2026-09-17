import { describe, expect, it } from 'vitest';
import {
  formatDelta,
  formatKstDate,
  formatKstDateTime,
  formatKstShortDate,
  formatNumber,
  formatWon,
} from './format';

// 2026-09-17 02:44 UTC = 2026-09-17 11:44 KST
const SAMPLE = '2026-09-17T02:44:00Z';

describe('KST 포맷', () => {
  it('브라우저 시간대와 무관하게 KST 날짜를 낸다', () => {
    expect(formatKstDate(SAMPLE)).toBe('2026-09-17');
  });

  it('수집 시각 표기는 KST 를 명시한다', () => {
    expect(formatKstDateTime(SAMPLE)).toBe('2026-09-17 11:44 KST');
  });

  it('날짜가 UTC 기준으로는 전날이어도 KST 기준으로 넘어간다', () => {
    // 2026-09-17 16:00 UTC = 2026-09-18 01:00 KST
    expect(formatKstDate('2026-09-17T16:00:00Z')).toBe('2026-09-18');
  });

  it('헤더용 짧은 날짜는 요일을 한글로 붙인다', () => {
    expect(formatKstShortDate(SAMPLE)).toBe('9/17(목)');
  });
});

describe('숫자 포맷', () => {
  it('천 단위 구분자를 넣는다', () => {
    expect(formatNumber(78985355)).toBe('78,985,355');
  });

  it('값이 없으면 대시로 표시한다', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatWon(undefined)).toBe('—');
  });

  it('원 단위를 붙인다', () => {
    expect(formatWon(2095)).toBe('2,095원');
  });
});

describe('증감 포맷', () => {
  it('증가는 ▲, 감소는 ▼ 로 표시한다', () => {
    expect(formatDelta(1.6)).toEqual({ direction: 'up', label: '▲1.6%' });
    expect(formatDelta(-0.3)).toEqual({ direction: 'down', label: '▼0.3%' });
  });

  it('값이 없으면 방향 없이 표시한다', () => {
    expect(formatDelta(null).direction).toBe('flat');
  });
});
