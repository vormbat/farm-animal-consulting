/**
 * 환기 단계 판정.
 *
 * 온도만 보지 않는다. 글로벌 계사환경제어 업체 Munters 의 상업용
 * 컨트롤러(Rotem Trio)는 **온도가 요구하는 환기량과 습도가 요구하는 환기량을
 * 각각 계산해 그중 더 큰 쪽을 따른다.** 온도상 최소환기여도 습도가 높으면
 * 자동으로 단계가 올라간다는 뜻이다. 그 이중제어를 여기 옮겼다.
 *
 * 구간 숫자는 확정값이 아니다. Aviagen·PIC 원 지침은 온도계 하나로 자르지 않고
 * **계군 행동(헐떡임·웅크림·피딩 활동)을 최종 판단 기준**으로 삼는다.
 * 여기 값은 "오늘 어느 단계부터 점검을 시작할지" 가늠하는 참고선이다.
 */

/** 3단계 체계의 자리. 0=최소 · 1=전이(중간) · 2=터널(최대) */
export type VentStageIndex = 0 | 1 | 2;

/** PIC 2019 Wean to Finish Guidelines: 습도는 항상 65% 이하로 유지. */
export const HUMIDITY_THRESHOLD = 65;
/** 이 이상이면 온도와 무관하게 최대 단계로 본다. */
export const HUMIDITY_SEVERE = 80;

/** 목표온도 대비 오늘 최고기온 차이로 정하는 단계. */
export function tempStage(diff: number): VentStageIndex {
  if (diff <= 0) return 0;
  if (diff <= 5) return 1;
  return 2;
}

/** 습도만으로 정하는 단계. */
export function humidityStage(humidity: number | null): VentStageIndex {
  if (humidity === null) return 0;
  if (humidity > HUMIDITY_SEVERE) return 2;
  if (humidity > HUMIDITY_THRESHOLD) return 1;
  return 0;
}

export interface VentRecommendation {
  /** 최종 권고 단계 */
  stage: VentStageIndex;
  /** 온도만 봤을 때의 단계 */
  byTemp: VentStageIndex;
  /** 습도만 봤을 때의 단계 */
  byHumidity: VentStageIndex;
  /** 목표온도 대비 차이(°C) */
  diff: number;
  /** 습도 때문에 온도 기준보다 올라갔는가 */
  humidityDriven: boolean;
  /**
   * 환기를 더 늘려도 습도가 잘 안 떨어지는 조건인가.
   *
   * 바깥 기온이 이미 목표를 넘어선 상태에서 습도까지 높으면 들여올 공기 자체가
   * 덥고 습하다. 이때는 팬을 더 돌리는 것으로 풀리지 않으므로 따로 알린다.
   */
  humidityIneffective: boolean;
}

export function recommend(
  todayHigh: number,
  targetTemp: number,
  humidity: number | null,
): VentRecommendation {
  const diff = Math.round(todayHigh) - targetTemp;
  const byTemp = tempStage(diff);
  const byHumidity = humidityStage(humidity);
  // 이중제어: 둘 중 큰 쪽을 따른다.
  const stage = Math.max(byTemp, byHumidity) as VentStageIndex;

  return {
    stage,
    byTemp,
    byHumidity,
    diff,
    humidityDriven: byHumidity > byTemp,
    humidityIneffective: humidity !== null && humidity > HUMIDITY_THRESHOLD && diff > 0,
  };
}
