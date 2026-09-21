import { useQuery } from '@tanstack/react-query';
import type { FarmLocation } from '@/lib/location';

/**
 * Open-Meteo 연동.
 *
 * 이 API 는 브라우저에서 직접 부른다. 다른 수집원과 달리 수집 단계로 옮기지
 * 않는 이유는 (1) 사용자가 고른 위치마다 달라 미리 모아 둘 수 없고,
 * (2) CORS 를 열어 둔 공개 API 라 공개 프록시를 거칠 일이 없기 때문이다.
 * 우리가 걷어낸 것은 '제3자 프록시 경유'이지 '브라우저에서 부르는 것' 자체가 아니다.
 *
 * 예보와 작년 비교는 **따로** 받는다. archive-api 는 느리거나 막히는 일이 잦은데,
 * 하나로 묶으면 그것 하나 때문에 예보까지 통째로 실패한다. 작년 칸만 비우는 편이 낫다.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const TIMEZONE = 'Asia/Seoul';
export const FORECAST_DAYS = 7;

/** 하루 예보 한 칸. */
export interface ForecastDay {
  /** `2026-09-21` */
  date: string;
  /** WMO 날씨 코드 */
  code: number;
  tMax: number | null;
  tMin: number | null;
  rain: number | null;
  /** 일 최대 풍속(m/s) */
  wind: number | null;
  /** 일 평균 상대습도(%) */
  humidity: number | null;
  /** 낮(06~17시) 최대 풍속 */
  windDay: number | null;
  /** 밤(18~05시) 최대 풍속 */
  windNight: number | null;
  /** 낮 평균 습도 */
  humidityDay: number | null;
  /** 밤 평균 습도 */
  humidityNight: number | null;
}

export interface ForecastHour {
  /** 0~23 */
  hour: number;
  code: number;
  temp: number | null;
  rain: number | null;
  wind: number | null;
  humidity: number | null;
}

export interface Forecast {
  days: ForecastDay[];
  /** 날짜별 시간대 목록 */
  hourly: Record<string, ForecastHour[]>;
}

/** 작년 같은 주. 예보보다 항목이 적다(시간대·풍속 없음). */
export interface ArchiveDay {
  date: string;
  code: number;
  tMax: number | null;
  tMin: number | null;
  rain: number | null;
  humidity: number | null;
}

export interface GeocodeResult {
  id: number;
  name: string;
  lat: number;
  lng: number;
  /** `경기도 · 수원시` 처럼 구분용 상위 행정구역 */
  detail: string;
}

interface DailyBlock {
  time: string[];
  weathercode: number[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  windspeed_10m_max?: (number | null)[];
  relative_humidity_2m_mean?: (number | null)[];
}

interface HourlyBlock {
  time: string[];
  weathercode: number[];
  temperature_2m: (number | null)[];
  precipitation: (number | null)[];
  windspeed_10m: (number | null)[];
  relativehumidity_2m: (number | null)[];
}

async function getJson<T>(
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<T> {
  // 자체 시간 제한. Open-Meteo 가 응답을 오래 붙들고 있는 경우가 있어
  // 사용자가 빈 카드만 보며 기다리지 않게 한다.
  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(), timeoutMs);
  const onAbort = () => timer.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const response = await fetch(url, { signal: timer.signal });
    if (!response.ok) throw new Error(`날씨 서버 응답 오류 (HTTP ${response.status})`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** `2026-09-21` (KST 기준 달력 날짜) */
function ymd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function maxOf(values: (number | null)[]): number | null {
  const numbers = values.filter((value): value is number => value !== null);
  return numbers.length > 0 ? Math.max(...numbers) : null;
}

function meanOf(values: (number | null)[]): number | null {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

/** 낮은 06~17시, 밤은 18~05시. 축사 커튼·환기 운용이 이 경계로 갈린다. */
const isDaytime = (hour: number) => hour >= 6 && hour < 18;

function groupHourly(block: HourlyBlock | undefined): Record<string, ForecastHour[]> {
  const grouped: Record<string, ForecastHour[]> = {};
  if (!block?.time) return grouped;
  block.time.forEach((stamp, index) => {
    const date = stamp.slice(0, 10);
    (grouped[date] ??= []).push({
      hour: Number(stamp.slice(11, 13)),
      code: block.weathercode[index] ?? 0,
      temp: block.temperature_2m[index] ?? null,
      rain: block.precipitation[index] ?? null,
      wind: block.windspeed_10m[index] ?? null,
      humidity: block.relativehumidity_2m[index] ?? null,
    });
  });
  return grouped;
}

export async function fetchForecast(
  location: FarmLocation,
  signal?: AbortSignal,
): Promise<Forecast> {
  const url =
    `${FORECAST_URL}?latitude=${location.lat}&longitude=${location.lng}` +
    '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,' +
    'windspeed_10m_max,relative_humidity_2m_mean' +
    '&hourly=temperature_2m,weathercode,precipitation,windspeed_10m,relativehumidity_2m' +
    `&timezone=${encodeURIComponent(TIMEZONE)}&forecast_days=${FORECAST_DAYS}&windspeed_unit=ms`;

  const payload = await getJson<{ daily: DailyBlock; hourly?: HourlyBlock }>(url, signal, 10_000);
  const daily = payload.daily;
  const hourly = groupHourly(payload.hourly);

  const days = daily.time.map((date, index): ForecastDay => {
    const hours = hourly[date] ?? [];
    const dayHours = hours.filter((hour) => isDaytime(hour.hour));
    const nightHours = hours.filter((hour) => !isDaytime(hour.hour));
    return {
      date,
      code: daily.weathercode[index] ?? 0,
      tMax: daily.temperature_2m_max[index] ?? null,
      tMin: daily.temperature_2m_min[index] ?? null,
      rain: daily.precipitation_sum[index] ?? null,
      wind: daily.windspeed_10m_max?.[index] ?? null,
      humidity: daily.relative_humidity_2m_mean?.[index] ?? null,
      windDay: maxOf(dayHours.map((hour) => hour.wind)),
      windNight: maxOf(nightHours.map((hour) => hour.wind)),
      humidityDay: meanOf(dayHours.map((hour) => hour.humidity)),
      humidityNight: meanOf(nightHours.map((hour) => hour.humidity)),
    };
  });

  return { days, hourly };
}

export async function fetchLastYear(
  location: FarmLocation,
  signal?: AbortSignal,
): Promise<ArchiveDay[]> {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  const end = new Date(start);
  end.setDate(start.getDate() + FORECAST_DAYS - 1);

  const url =
    `${ARCHIVE_URL}?latitude=${location.lat}&longitude=${location.lng}` +
    `&start_date=${ymd(start)}&end_date=${ymd(end)}` +
    '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,' +
    `relative_humidity_2m_mean&timezone=${encodeURIComponent(TIMEZONE)}`;

  const payload = await getJson<{ daily: DailyBlock }>(url, signal, 8_000);
  const daily = payload.daily;
  return daily.time.map((date, index) => ({
    date,
    code: daily.weathercode[index] ?? 0,
    tMax: daily.temperature_2m_max[index] ?? null,
    tMin: daily.temperature_2m_min[index] ?? null,
    rain: daily.precipitation_sum[index] ?? null,
    humidity: daily.relative_humidity_2m_mean?.[index] ?? null,
  }));
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=ko&format=json`;
  const payload = await getJson<{
    results?: {
      id: number;
      name: string;
      latitude: number;
      longitude: number;
      admin1?: string;
      admin2?: string;
    }[];
  }>(url, signal, 8_000);

  return (payload.results ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    lat: place.latitude,
    lng: place.longitude,
    // 같은 이름의 읍면이 여럿이라 상위 행정구역이 없으면 고를 수가 없다.
    detail: [place.admin1, place.admin2].filter(Boolean).join(' · '),
  }));
}

/** 예보는 자주 바뀌지 않는다. 탭을 오갈 때마다 다시 받지 않게 한다. */
const FRESH_FOR = 10 * 60 * 1000;

export function useForecast(location: FarmLocation | null) {
  return useQuery({
    queryKey: ['weather', 'forecast', location?.lat, location?.lng],
    queryFn: ({ signal }) => fetchForecast(location!, signal),
    enabled: location !== null,
    staleTime: FRESH_FOR,
  });
}

export function useLastYear(location: FarmLocation | null) {
  return useQuery({
    queryKey: ['weather', 'last-year', location?.lat, location?.lng],
    queryFn: ({ signal }) => fetchLastYear(location!, signal),
    enabled: location !== null,
    staleTime: 24 * 60 * 60 * 1000,
    // 작년 값은 부가 정보다. 실패해도 예보 화면은 그대로 두고 그 칸만 비운다.
    retry: 1,
  });
}
