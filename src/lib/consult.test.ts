import { describe, expect, it } from 'vitest';
import { CONSULT_BREEDS } from '@/data/breeds';
import {
  broilerAt,
  layerAt,
  productionGrade,
  productionIndex,
  requiredGain,
  waterFromFeed,
  type LayerTable,
} from './consult';

const ross = CONSULT_BREEDS.broiler.breeds.ross308.data as number[][];
const hylineBrown = CONSULT_BREEDS.layer.breeds.hylineBrown.data as unknown as LayerTable;

describe('육계 사육표준 조회', () => {
  it('원본 화면과 같은 7일령 값을 낸다', () => {
    const found = broilerAt(ross, 7)!;
    expect(found.interpolated).toBe(false);
    expect(found.value).toMatchObject({
      weight: 213,
      gain: 32,
      cumulativeFeed: 166,
      fcr: 0.78,
      // 매뉴얼에 없는 값. 누적(166) - 전날 누적(131) = 35
      dailyFeed: 35,
    });
  });

  it('첫날은 뺄 전날이 없어 누적값을 그대로 쓴다', () => {
    expect(broilerAt(ross, 1)!.value.dailyFeed).toBe(12);
  });

  it('육계 표는 일령이 빠짐없이 있어 보간이 걸리지 않는다', () => {
    const last = ross.at(-1)![0]!;
    for (let day = 0; day <= last; day += 1) {
      expect(broilerAt(ross, day)!.interpolated, `${day}일령`).toBe(false);
    }
  });

  it('표에 없는 자리는 앞뒤를 선형보간하고 그 사실을 밝힌다', () => {
    const found = broilerAt(
      [
        [0, 100, null as unknown as number, 0, 0],
        [10, 200, 10, 300, 1.5],
      ],
      5,
    )!;
    expect(found.interpolated).toBe(true);
    expect(found.value.weight).toBe(150);
  });

  it('표 범위를 넘으면 마지막 값에 붙는다', () => {
    const last = ross.at(-1)!;
    expect(broilerAt(ross, 999)!.value.weight).toBe(last[1]);
  });
});

describe('산란계 사육표준 조회', () => {
  it('산란 개시 전은 육성기 표를 본다', () => {
    const found = layerAt(hylineBrown, 10)!;
    expect(found.value.phase).toBe('rearing');
    expect(found.value.weight).toBe(896);
    expect(found.value.feed).toBe(59);
    expect(found.value.water).toBe(104);
    // 육성기에는 산란율·난중이 없다.
    expect(found.value.layRate).toBeNull();
    expect(found.value.eggWeight).toBeNull();
  });

  it('원본 화면과 같은 25주령 값을 낸다', () => {
    const found = layerAt(hylineBrown, 25)!;
    expect(found.value.phase).toBe('production');
    expect(found.value.layRate).toBe(95.8);
    expect(found.value.weight).toBe(1830);
    expect(found.value.eggWeight).toBe(55.9);
    expect(found.value.feed).toBe(112);
    expect(found.value.water).toBe(197);
    expect(found.value.mortality).toBe(0.53);
  });

  it('산란 개시 주령은 품종 표에서 읽는다', () => {
    // 숫자를 박아 두면 개시 주령이 다른 품종에서 육성기 표를 잘못 본다.
    const lohmann = CONSULT_BREEDS.layer.breeds.lohmann.data as unknown as LayerTable;
    const start = lohmann.production[0]![0]!;
    expect(layerAt(lohmann, start)!.value.phase).toBe('production');
    expect(layerAt(lohmann, start - 1)!.value.phase).toBe('rearing');
  });

  it('표에 없는 주령은 보간한다', () => {
    // 50주 이후는 5주 간격이다.
    const found = layerAt(hylineBrown, 52)!;
    expect(found.interpolated).toBe(true);
    expect(found.value.phase).toBe('production');
  });
});

describe('음수량 환산', () => {
  it('원본 화면과 같은 범위를 낸다', () => {
    // 7일령 사료 35g · 물:사료 1.6~1.8 : 1 → 56~63 ml
    const range = waterFromFeed('broiler', 35)!;
    expect(Math.round(range.low)).toBe(56);
    expect(Math.round(range.high)).toBe(63);
    expect(range.factor).toBe(1);
  });

  it('더우면 더 마시는 것으로 보정한다', () => {
    const cool = waterFromFeed('broiler', 100, 20)!;
    const hot = waterFromFeed('broiler', 100, 30)!;
    expect(hot.low).toBeGreaterThan(cool.low);
  });

  it('사료섭취량을 모르면 환산하지 않는다', () => {
    expect(waterFromFeed('broiler', null)).toBeNull();
  });
});

describe('육계 생산지수', () => {
  const sample = { placed: 30000, shipped: 29400, days: 33, feedKg: 62000, totalWeightKg: 51000 };

  it('원본 화면과 같은 값을 낸다', () => {
    const result = productionIndex(sample)!;
    expect(result.survival).toBeCloseTo(98.0, 1);
    expect(result.avgWeightKg).toBeCloseTo(1.73, 2);
    expect(result.adg).toBeCloseTo(52.6, 1);
    expect(result.fcr).toBeCloseTo(1.216, 3);
    expect(Math.round(result.epef)).toBe(424);
  });

  it('입력이 0이면 계산하지 않는다', () => {
    expect(productionIndex({ ...sample, placed: 0 })).toBeNull();
    expect(productionIndex({ ...sample, totalWeightKg: 0 })).toBeNull();
  });

  it.each([
    [424, '최우수'],
    [400, '최우수'],
    [370, '우수'],
    [320, '양호'],
    [270, '보통'],
    [200, '개선 필요'],
  ])('지수 %i 는 %s 등급이다', (epef, label) => {
    expect(productionGrade(epef as number).label).toBe(label);
  });
});

describe('목표 생산지수 역산', () => {
  it('원본 화면과 같은 값을 낸다', () => {
    // 목표 400 · 생존율 97% · 33일 · FCR 1.55 → 63.9 g/일, 2.11 kg
    const result = requiredGain({ target: 400, survival: 97, days: 33, fcr: 1.55 })!;
    expect(result.adg).toBeCloseTo(63.9, 1);
    expect(result.weightKg).toBeCloseTo(2.11, 2);
  });

  it('정방향 공식을 되돌리면 목표 지수가 나온다', () => {
    const reverse = requiredGain({ target: 380, survival: 96, days: 35, fcr: 1.6 })!;
    const back = (96 * reverse.adg) / (1.6 * 10);
    expect(back).toBeCloseTo(380, 6);
  });

  it('생존율이 0이면 계산하지 않는다', () => {
    expect(requiredGain({ target: 400, survival: 0, days: 33, fcr: 1.55 })).toBeNull();
  });
});
