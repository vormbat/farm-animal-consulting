import { describe, expect, it } from 'vitest';
import { SOLAR_TERMS } from '@/data/solar-terms';
import { daysSince, daysUntil, progressPercent, solarTermInfo, sunLongitude } from './solar-terms';

/**
 * 절기 계산은 화면에 날짜로 바로 찍히므로, 공표된 날짜와 맞는지가 유일하게
 * 의미 있는 검증이다. 한국천문연구원이 공표한 2026년 4대 절기로 확인한다.
 */

/** KST 기준 `YYYY-MM-DD` */
function kstDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** 그 해에 목표 황경을 지나는 순간을 찾는다(테스트용 전수 조회). */
function momentOf(year: number, deg: number): Date {
  for (let day = 0; day < 366; day += 1) {
    const at = new Date(Date.UTC(year, 0, 1) + day * 86_400_000);
    const info = solarTermInfo(at);
    if (info.current.term.deg === deg && daysSince(info.current, at) === 0) {
      return info.current.at;
    }
  }
  throw new Error(`${year}년 황경 ${deg}° 를 찾지 못했습니다`);
}

describe('절기 데이터', () => {
  it('24개가 15도 간격으로 빠짐없이 있다', () => {
    const degrees = SOLAR_TERMS.map((term) => term.deg).sort((a, b) => a - b);
    expect(degrees).toEqual(Array.from({ length: 24 }, (_, index) => index * 15));
  });
});

describe('sunLongitude', () => {
  it('춘분 무렵에 0도 근처를 지난다', () => {
    // 2026-03-20 KST 는 UTC 로 전날 밤이다. 하루 폭이면 0°/360° 를 걸친다.
    const before = sunLongitude(new Date('2026-03-19T00:00:00Z'));
    const after = sunLongitude(new Date('2026-03-21T00:00:00Z'));
    expect(before).toBeGreaterThan(358);
    expect(after).toBeLessThan(2);
  });
});

describe('solarTermInfo', () => {
  it.each([
    ['춘분', 0, '2026-03-20'],
    ['하지', 90, '2026-06-21'],
    ['추분', 180, '2026-09-23'],
    ['동지', 270, '2026-12-22'],
  ])('2026년 %s 는 %i도, %s 이다', (name, deg, expected) => {
    const at = momentOf(2026, deg as number);
    expect(kstDate(at)).toBe(expected);
    expect(SOLAR_TERMS.find((term) => term.deg === deg)?.name).toBe(name);
  });

  it('현재 절기와 다음 절기가 이어진다', () => {
    const info = solarTermInfo(new Date('2026-09-21T12:00:00+09:00'));
    expect(info.current.term.name).toBe('백로');
    expect(info.next.term.name).toBe('추분');
    expect(info.next.at.getTime()).toBeGreaterThan(info.current.at.getTime());
  });

  it('한 절기는 14~17일 사이다', () => {
    // 지구 공전이 타원이라 절기 간격이 일정하지 않다. 그 폭을 벗어나면
    // 이분법이 엉뚱한 경계를 잡은 것이다.
    for (let month = 0; month < 12; month += 1) {
      const info = solarTermInfo(new Date(Date.UTC(2026, month, 5)));
      const days = (info.next.at.getTime() - info.current.at.getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(14);
      expect(days).toBeLessThan(17);
    }
  });

  it('해가 바뀌는 구간에서도 황경이 0으로 돌아가며 이어진다', () => {
    // 동지(270°) 다음은 소한(285°)이고, 그 뒤로 입춘(315°)에서 우수(330°),
    // 경칩(345°)을 지나 춘분(0°)으로 돌아온다. 이 마지막 경계가 잘 넘어가는지.
    const info = solarTermInfo(new Date('2026-03-15T00:00:00+09:00'));
    expect(info.current.term.deg).toBe(345);
    expect(info.next.term.deg).toBe(0);
    expect(kstDate(info.next.at)).toBe('2026-03-20');
  });
});

describe('표시용 계산', () => {
  const now = new Date('2026-09-21T12:00:00+09:00');
  const info = solarTermInfo(now);

  it('시작한 지 며칠째인지 센다', () => {
    // 백로는 9/7 오후에 들어서므로 9/21 정오는 아직 13일째다(원본 화면과 같다).
    expect(daysSince(info.current, now)).toBe(13);
  });

  it('다음 절기까지 남은 날을 센다', () => {
    expect(daysUntil(info.next, now)).toBe(2);
  });

  it('진행률은 0~100 사이다', () => {
    const percent = progressPercent(info, now);
    expect(percent).toBeGreaterThan(80);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it('절기가 막 시작한 순간의 진행률은 0이다', () => {
    expect(progressPercent(info, info.current.at)).toBe(0);
  });
});
