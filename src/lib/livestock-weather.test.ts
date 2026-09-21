import { describe, expect, it } from 'vitest';
import { HYLINE_HSI } from '@/data/heat-stress';
import { BROILER_TARGET_TEMP, LAYER_TARGET_TEMP } from '@/data/target-temp';
import {
  apparentTargets,
  calcHeatStressIndex,
  calcTHI,
  calcWetBulb,
  calcWindChill,
  diurnalLevel,
  hsiInRange,
  hsiLevel,
  humidityAdjustment,
  parseAgeRange,
  targetTempForAge,
  thiLevel,
  thiPercent,
  waterTempFactor,
} from './livestock-weather';

describe('THI', () => {
  it('원본 화면과 같은 값을 낸다', () => {
    // 2026-09-21 수원: 한낮 27°C / 습도 48% → 74
    expect(calcTHI(27, 48)).toBe(74);
  });

  it('습도가 같으면 기온이 오를수록 커진다', () => {
    expect(calcTHI(30, 60)!).toBeGreaterThan(calcTHI(25, 60)!);
  });

  it('기온이 같으면 습도가 오를수록 커진다', () => {
    expect(calcTHI(30, 80)!).toBeGreaterThan(calcTHI(30, 40)!);
  });

  it('값이 없으면 계산하지 않는다', () => {
    expect(calcTHI(null, 50)).toBeNull();
    expect(calcTHI(25, null)).toBeNull();
  });

  it.each([
    [60, '정상'],
    [70, '경미'],
    [74, '중등도'],
    [85, '심각'],
    [95, '위험'],
  ])('THI %i 는 %s 단계다', (thi, label) => {
    expect(thiLevel(thi as number)?.label).toBe(label);
  });

  it('경계값은 아래 단계에 속한다', () => {
    expect(thiLevel(67)?.label).toBe('정상');
    expect(thiLevel(68)?.label).toBe('경미');
    expect(thiLevel(72)?.label).toBe('중등도');
    expect(thiLevel(80)?.label).toBe('심각');
    expect(thiLevel(90)?.label).toBe('위험');
  });

  it('게이지는 0~100 안에 머문다', () => {
    expect(thiPercent(40)).toBe(0);
    expect(thiPercent(120)).toBe(100);
    expect(thiPercent(null)).toBe(0);
  });
});

describe('윈드칠', () => {
  it('공식이 유효한 10도 이하에서만 계산한다', () => {
    // 겨울 지표를 여름에 들이대면 엉뚱한 값이 나오므로 아예 내지 않는다.
    expect(calcWindChill(15, 5)).toBeNull();
    expect(calcWindChill(-5, 5)).not.toBeNull();
  });

  it('바람이 셀수록 더 춥게 나온다', () => {
    expect(calcWindChill(-5, 10)!).toBeLessThan(calcWindChill(-5, 2)!);
  });

  it('기온보다 낮거나 같다', () => {
    expect(calcWindChill(0, 5)!).toBeLessThanOrEqual(0);
  });
});

describe('일교차', () => {
  it.each([
    [5, '안전'],
    [10, '주의'],
    [13, '경보'],
  ])('%i도 차이는 %s 다', (range, label) => {
    expect(diurnalLevel(range as number)?.label).toBe(label);
  });
});

describe('습구온도', () => {
  it('건구온도보다 낮다 — 쿨링패드가 내려갈 수 있는 바닥이다', () => {
    expect(calcWetBulb(27, 48)!).toBeLessThan(27);
  });

  it('Stull(2011) 근사식 값을 낸다', () => {
    // 27°C / 48% → 19.39°C. 화면에 찍히는 값은 기온·습도를 이미 반올림해
    // 넣으므로 조금 달라질 수 있다(26.6°C/48% 면 19.05°C).
    expect(calcWetBulb(27, 48)!).toBeCloseTo(19.39, 2);
  });

  it('습도가 100%에 가까우면 건구온도에 붙는다', () => {
    expect(calcWetBulb(25, 99)!).toBeGreaterThan(24);
  });
});

describe('Hy-Line 열스트레스 지수', () => {
  it('표에 있는 칸은 그 값 그대로 나온다', () => {
    const { temps, rhs, grid } = HYLINE_HSI;
    expect(calcHeatStressIndex(temps[0]!, rhs[0]!)).toBe(grid[0]![0]);
    expect(calcHeatStressIndex(temps[9]!, rhs[19]!)).toBe(grid[9]![19]);
  });

  it('칸 사이는 보간한다', () => {
    const between = calcHeatStressIndex(21, 5)!;
    expect(between).toBeGreaterThanOrEqual(HYLINE_HSI.grid[0]![0]!);
    expect(between).toBeLessThanOrEqual(HYLINE_HSI.grid[1]![0]!);
  });

  it('표 밖은 외삽하지 않고 끝 값에 붙인다', () => {
    // 매뉴얼이 제시하지 않은 구간을 임의로 늘려 잡지 않는다.
    expect(calcHeatStressIndex(50, 50)).toBe(calcHeatStressIndex(38, 50));
    expect(calcHeatStressIndex(0, 50)).toBe(calcHeatStressIndex(20, 50));
  });

  it('20도 미만은 열스트레스 판정 구간이 아니다', () => {
    expect(hsiInRange(19.9)).toBe(false);
    expect(hsiInRange(20)).toBe(true);
    expect(hsiInRange(null)).toBe(false);
  });

  it.each([
    [60, 'comfort'],
    [70, 'alert'],
    [76, 'danger'],
    [82, 'emergency'],
  ])('지수 %i 는 %s 단계다', (hsi, key) => {
    expect(hsiLevel(hsi as number)?.key).toBe(key);
  });

  it('쾌적 단계는 아래를 다 흘려보낸 마지막 칸이라 조건 없이 걸린다', () => {
    // 원본의 -Infinity 가 JSON 을 거치며 null 이 됐다. null 을 못 다루면
    // 낮은 지수에서 단계가 통째로 사라진다.
    expect(hsiLevel(10)?.key).toBe('comfort');
    expect(hsiLevel(-5)?.key).toBe('comfort');
  });
});

describe('Aviagen 체감 목표 계사온도', () => {
  it('습도 50%에서는 표준 대비 증감이 없다', () => {
    for (const row of apparentTargets(50)) expect(row.delta).toBe(0);
  });

  it('습도가 높을수록 목표온도를 낮춘다', () => {
    const dry = apparentTargets(40);
    const humid = apparentTargets(70);
    dry.forEach((row, index) => expect(humid[index]!.target).toBeLessThan(row.target));
  });

  it('원본 화면과 같은 값을 낸다', () => {
    // 습도 48% → 입추 병아리 33.8°C (표준 대비 +0.6°C)
    const chick = apparentTargets(48)[0]!;
    expect(chick.target).toBeCloseTo(33.8, 1);
    expect(chick.delta).toBeCloseTo(0.6, 1);
  });

  it('습도가 없으면 표를 내지 않는다', () => {
    expect(apparentTargets(null)).toEqual([]);
  });
});

describe('음수량 온도보정', () => {
  it('20도 이하는 보정하지 않는다', () => {
    expect(waterTempFactor(20)).toBe(1);
    expect(waterTempFactor(null)).toBe(1);
  });

  it('20도를 넘으면 1도당 6%씩 오른다', () => {
    expect(waterTempFactor(25)).toBeCloseTo(1.3, 5);
  });

  it('38도를 넘어도 더 올리지 않는다', () => {
    expect(waterTempFactor(45)).toBeCloseTo(waterTempFactor(38), 5);
  });
});

describe('사양단계 구간 표기', () => {
  it.each([
    ['1~3일', [1, 3]],
    ['36일~', [36, Infinity]],
    ['1주령', [1, 1]],
    ['8~17주', [8, 17]],
    ['18주~ 산란', [18, Infinity]],
  ])('%s 를 구간으로 읽는다', (label, expected) => {
    expect(parseAgeRange(label as string)).toEqual(expected);
  });

  it('육계 일령에 맞는 목표온도를 찾는다', () => {
    expect(targetTempForAge(BROILER_TARGET_TEMP, 2)).toBe(33);
    expect(targetTempForAge(BROILER_TARGET_TEMP, 20)).toBe(27);
    expect(targetTempForAge(BROILER_TARGET_TEMP, 99)).toBe(20);
  });

  it('산란계 주령에 맞는 목표온도를 찾는다', () => {
    expect(targetTempForAge(LAYER_TARGET_TEMP, 1)).toBe(34);
    expect(targetTempForAge(LAYER_TARGET_TEMP, 30)).toBe(24);
  });
});

describe('습도 보정', () => {
  it('60% 이하는 보정하지 않는다', () => {
    expect(humidityAdjustment(55)).toBe(0);
    expect(humidityAdjustment(60)).toBe(0);
  });

  it('60% 초과분 5%p마다 1도씩 내린다', () => {
    expect(humidityAdjustment(65)).toBe(1);
    expect(humidityAdjustment(74)).toBe(2);
    expect(humidityAdjustment(75)).toBe(3);
  });
});
