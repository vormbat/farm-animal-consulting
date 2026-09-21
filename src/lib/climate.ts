import { calcHeatStressIndex, calcTHI, calcWetBulb, calcWindChill } from './livestock-weather';
import { useFarmLocation } from './location';
import { useForecast, type Forecast, type ForecastHour } from './weather-api';

/**
 * 오늘 기후 요약.
 *
 * 날씨 탭만의 것이 아니다. 환기가이드는 바깥 조건에서 권고를 내고, 질병 탭도
 * 같은 값을 본다. 그래서 세 탭이 각자 계산하지 않도록 여기 한 번만 둔다.
 *
 * **일 최고기온이 아니라 한낮(11~15시) 중 가장 가혹한 시간대**를 기준으로 삼는다.
 * Hy-Line 지침이 "계군이 실제로 노출된 최고 조건"으로 조치를 규정하기 때문이다.
 * 같은 32°C 라도 습도가 붙는 시간대가 계군에게는 더 힘들다.
 */

export interface TodayClimate {
  date: string;
  tMax: number | null;
  tMin: number | null;
  /** 한낮 중 가장 가혹한 시간대의 기온 */
  peakTemp: number | null;
  /** 그 시간대의 상대습도 */
  peakHumidity: number;
  /**
   * 일 평균 상대습도.
   *
   * 육추기 목표온도의 습도 보정에는 이쪽을 쓴다. 한낮 습도는 하루 중 가장
   * 건조한 값이라, 그것으로 보정하면 종일 축축한 날에도 보정이 걸리지 않는다.
   */
  meanHumidity: number | null;
  /** 그 조건의 Hy-Line 열스트레스 지수 */
  hsi: number | null;
  /** 그 조건의 THI */
  thi: number | null;
  wetBulb: number | null;
  /** 새벽 3~5시 중 가장 가혹한 조건의 지수 */
  nightHsi: number | null;
  nightThi: number | null;
  /** 일교차(°C) */
  diurnal: number | null;
  /** 겨울철 체감온도. 10°C 초과면 null */
  windChill: number | null;
  /** 이번 주 강수 예보가 있는 날 수 */
  rainDays: number;
}

/** 습도 결측 시 가정값. 국내 여름 평균 수준이다. */
const ASSUMED_HUMIDITY = 70;

/** 가장 가혹한(=지수가 높은) 시간대를 고른다. */
function worst(hours: ForecastHour[]): ForecastHour | null {
  if (hours.length === 0) return null;
  return hours.reduce((a, b) =>
    (calcHeatStressIndex(b.temp, b.humidity) ?? 0) > (calcHeatStressIndex(a.temp, a.humidity) ?? 0)
      ? b
      : a,
  );
}

export function summarizeToday(forecast: Forecast): TodayClimate | null {
  const today = forecast.days[0];
  if (!today) return null;
  const hours = forecast.hourly[today.date] ?? [];

  const peak = worst(hours.filter((hour) => hour.hour >= 11 && hour.hour <= 15));
  const peakTemp = peak?.temp ?? today.tMax;
  const peakHumidity = peak?.humidity ?? today.humidity ?? ASSUMED_HUMIDITY;

  const night = worst(hours.filter((hour) => hour.hour >= 3 && hour.hour <= 5));

  return {
    date: today.date,
    tMax: today.tMax,
    tMin: today.tMin,
    peakTemp,
    peakHumidity,
    meanHumidity: today.humidity,
    hsi: calcHeatStressIndex(peakTemp, peakHumidity),
    thi: calcTHI(peakTemp, peakHumidity),
    wetBulb: calcWetBulb(peakTemp, peakHumidity),
    nightHsi: calcHeatStressIndex(night?.temp ?? null, night?.humidity ?? null),
    nightThi: calcTHI(night?.temp ?? null, night?.humidity ?? null),
    diurnal:
      today.tMax !== null && today.tMin !== null ? Math.round(today.tMax - today.tMin) : null,
    // 겨울은 THI 가 늘 '정상' 이라 체감온도로 갈아탄다. 심야~새벽이 가장 춥다.
    windChill: calcWindChill(today.tMin, today.windNight ?? today.wind),
    rainDays: forecast.days.filter((day) => (day.rain ?? 0) > 0).length,
  };
}

/**
 * 오늘 기후 요약 훅.
 *
 * 위치를 아직 고르지 않았거나 예보를 못 받았으면 `climate` 가 null 이다.
 * 부르는 쪽은 그 경우 "날씨 탭에서 위치를 먼저 고르라"고 안내한다.
 */
export function useTodayClimate() {
  const location = useFarmLocation();
  const forecast = useForecast(location);
  return {
    location,
    climate: forecast.data ? summarizeToday(forecast.data) : null,
    forecast: forecast.data ?? null,
    isPending: location !== null && forecast.isPending,
    error: forecast.error,
  };
}
