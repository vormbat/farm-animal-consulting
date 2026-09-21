import { describe, expect, it } from 'vitest';
import { humidityStage, recommend, tempStage } from './ventilation';

describe('온도 기준 단계', () => {
  it('목표 이하면 최소환기다', () => {
    expect(tempStage(-6)).toBe(0);
    expect(tempStage(0)).toBe(0);
  });

  it('목표보다 5도까지는 전이환기다', () => {
    expect(tempStage(1)).toBe(1);
    expect(tempStage(5)).toBe(1);
  });

  it('5도를 넘으면 터널환기다', () => {
    expect(tempStage(6)).toBe(2);
    expect(tempStage(20)).toBe(2);
  });
});

describe('습도 기준 단계', () => {
  it('65% 이하는 올리지 않는다', () => {
    expect(humidityStage(50)).toBe(0);
    expect(humidityStage(65)).toBe(0);
  });

  it('65% 초과면 한 단계', () => {
    expect(humidityStage(66)).toBe(1);
    expect(humidityStage(80)).toBe(1);
  });

  it('80% 초과면 최대 단계', () => {
    expect(humidityStage(81)).toBe(2);
  });

  it('습도를 모르면 올리지 않는다', () => {
    expect(humidityStage(null)).toBe(0);
  });
});

describe('이중제어 권고', () => {
  it('온도가 낮아도 습도가 높으면 단계를 올린다', () => {
    // 원본 화면과 같은 상황: 27°C / 목표 33°C / 습도 76%
    const result = recommend(27, 33, 76);
    expect(result.byTemp).toBe(0);
    expect(result.byHumidity).toBe(1);
    expect(result.stage).toBe(1);
    expect(result.humidityDriven).toBe(true);
  });

  it('온도가 이미 높으면 습도가 단계를 끌어올리지 않는다', () => {
    const result = recommend(40, 20, 70);
    expect(result.byTemp).toBe(2);
    expect(result.stage).toBe(2);
    expect(result.humidityDriven).toBe(false);
  });

  it('덥고 습하면 환기만으로 안 된다고 알린다', () => {
    // 바깥 공기 자체가 덥고 습해 들여와도 습도가 안 떨어지는 조건.
    expect(recommend(30, 25, 75).humidityIneffective).toBe(true);
  });

  it('목표보다 서늘하면 습도가 높아도 환기로 풀린다', () => {
    expect(recommend(20, 25, 75).humidityIneffective).toBe(false);
  });

  it('목표 대비 차이를 함께 돌려준다', () => {
    expect(recommend(27, 33, 50).diff).toBe(-6);
    expect(recommend(27.4, 20, 50).diff).toBe(7);
  });
});
