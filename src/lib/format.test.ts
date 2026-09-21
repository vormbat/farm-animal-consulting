import { describe, expect, it } from 'vitest';
import {
  formatDelta,
  formatKstDate,
  formatKstDateTime,
  formatKstShortDate,
  formatNumber,
  formatWon,
  particle,
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

describe('조사 고르기', () => {
  it('받침이 없으면 로, 있으면 으로', () => {
    // 원본은 데이터에서 문구를 조립하며 '전이환기으로' 를 냈다.
    expect(particle('전이환기', '으로')).toBe('로');
    expect(particle('최소환기', '으로')).toBe('로');
    expect(particle('하절기(최대)환기', '으로')).toBe('로');
  });

  it('으로만은 받침 ㄹ 도 로 쪽으로 친다', () => {
    expect(particle('서울', '으로')).toBe('로');
    expect(particle('물', '으로')).toBe('로');
    // 은/는 은 ㄹ 도 받침으로 센다.
    expect(particle('서울', '은')).toBe('은');
  });

  it('받침 있는 말에는 으로', () => {
    expect(particle('터널환기단', '으로')).toBe('으로');
    expect(particle('산란계장', '으로')).toBe('으로');
  });

  it('은·이·을·과를 가른다', () => {
    expect(particle('닭', '은')).toBe('은');
    expect(particle('오리', '은')).toBe('는');
    expect(particle('닭', '이')).toBe('이');
    expect(particle('오리', '이')).toBe('가');
    expect(particle('닭', '을')).toBe('을');
    expect(particle('오리', '을')).toBe('를');
    expect(particle('닭', '과')).toBe('과');
    expect(particle('오리', '과')).toBe('와');
  });

  it('한글이 아니면 받침 있는 쪽으로 둔다', () => {
    expect(particle('Tunnel', '으로')).toBe('으로');
    expect(particle('', '은')).toBe('은');
  });
});
