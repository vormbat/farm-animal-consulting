import { WX_DESC, WX_ICONS } from '@/data/weather-codes';
import { windLevel } from '@/lib/livestock-weather';
import type { FarmLocation } from '@/lib/location';
import type { ArchiveDay, Forecast, ForecastDay, ForecastHour } from '@/lib/weather-api';

/**
 * 주간 날씨 · 올해 vs 작년.
 *
 * 작년 같은 주를 나란히 두는 것이 이 카드의 요점이다. 농가는 "예년보다
 * 더운가"로 판단을 내리지, 절대 기온만으로는 입추·환기 계획을 세우지 않는다.
 *
 * 습도와 풍속은 **낮(06~17시)과 밤(18~05시)을 나눠** 보여 준다. 커튼·환기
 * 운용이 낮밤으로 갈리는데 일 최댓값 하나로는 밤에 바람이 죽는지 알 수 없다.
 */

interface Props {
  location: FarmLocation;
  forecast: Forecast;
  lastYear: ArchiveDay[] | undefined;
  lastYearFailed: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** `9/22(화)` — 날짜 문자열은 KST 달력 날짜라 그대로 쪼갠다. */
function dayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAY[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

/** `자정` `새벽3시` `오전9시` `정오` `오후3시` `밤9시` — 농가가 쓰는 말로 적는다. */
function hourLabel(hour: number): string {
  if (hour === 0) return '자정';
  if (hour < 6) return `새벽${hour}시`;
  if (hour < 12) return `오전${hour}시`;
  if (hour === 12) return '정오';
  if (hour < 18) return `오후${hour - 12}시`;
  return `밤${hour - 12}시`;
}

const icon = (code: number) => WX_ICONS[code] ?? '❓';
const describe = (code: number) => WX_DESC[code] ?? '—';
const round = (value: number | null) => (value === null ? '—' : `${Math.round(value)}°`);
const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);
const ms = (value: number | null) => (value === null ? '—' : value.toFixed(1));

/** 올해가 작년보다 높으면 ▲, 낮으면 ▼. 축산에서는 붉은 쪽이 더움이다. */
function Diff({ now, before }: { now: number | null; before: number | null }) {
  if (now === null || before === null) return <span className="text-[#bbb]">—</span>;
  const gap = Math.round(now) - Math.round(before);
  if (gap === 0) return <span className="text-[var(--color-ink-muted)]">±0°</span>;
  const up = gap > 0;
  return (
    <span style={{ color: up ? 'var(--color-col-today)' : 'var(--color-col-month)' }}>
      {up ? '▲' : '▼'}
      {Math.abs(gap)}°
    </span>
  );
}

function HourStrip({ hours, date }: { hours: ForecastHour[]; date: string }) {
  // 3시간 간격이면 하루가 여덟 칸이다. 한 화면에 들어오고 야간도 빠지지 않는다.
  const picked = hours.filter((hour) => hour.hour % 3 === 0);
  if (picked.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3">
      <p className="text-[11px] font-bold">
        🕐 {dayLabel(date)} 시간대별 날씨
        <span className="ml-1.5 font-medium text-[var(--color-ink-muted)]">
          3시간 간격 · 날짜 카드를 눌러 변경
        </span>
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {picked.map((hour) => (
          <div key={hour.hour} className="min-w-[68px] flex-1 text-center">
            <p className="text-[10px] text-[var(--color-ink-muted)]">
              {hour.hour >= 6 && hour.hour < 18 ? '🌞' : '🌙'} {hourLabel(hour.hour)}
            </p>
            <p className="text-lg leading-tight">{icon(hour.code)}</p>
            <p className="text-sm font-bold">{round(hour.temp)}</p>
            <p className="text-[10px] text-[var(--color-ink-muted)]">💦{percent(hour.humidity)}</p>
            <p className="text-[10px] text-[var(--color-ink-muted)]">💨{ms(hour.wind)}m/s</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-[#bbb]">💦 습도 · 💧 강수량 · 💨 풍속(m/s)</p>
    </div>
  );
}

function DayCard({
  day,
  before,
  selected,
  onSelect,
}: {
  day: ForecastDay;
  before: ArchiveDay | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-w-[150px] flex-1 rounded-xl border-2 bg-white p-2.5 text-left transition-colors ${
        selected ? 'border-[var(--color-tab-accent)]' : 'border-transparent hover:bg-black/[0.02]'
      }`}
    >
      <p className="text-[11px] font-bold">{dayLabel(day.date)}</p>

      <div className="mt-1.5">
        <p className="text-[10px] font-semibold text-[var(--color-ink-muted)]">올해</p>
        <p className="text-xl leading-tight">{icon(day.code)}</p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">{describe(day.code)}</p>
        <p className="text-sm font-extrabold">
          <span className="text-[var(--color-col-today)]">{round(day.tMax)}</span>
          <span className="mx-1 text-[#ccc]">/</span>
          <span className="text-[var(--color-col-month)]">{round(day.tMin)}</span>
        </p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">
          💦 🌞{percent(day.humidityDay)} 🌙{percent(day.humidityNight)}
        </p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">
          🌞{ms(day.windDay)} 🌙{ms(day.windNight)}m/s
          {day.rain ? <> · 💧{day.rain.toFixed(1)}mm</> : null}
        </p>
      </div>

      <div className="mt-1.5 border-t border-black/[0.06] pt-1.5">
        <p className="text-[10px] font-semibold text-[var(--color-ink-muted)]">작년</p>
        {before ? (
          <>
            <p className="text-base leading-tight">{icon(before.code)}</p>
            <p className="text-[10px] text-[var(--color-ink-muted)]">{describe(before.code)}</p>
            <p className="text-[13px] font-bold text-[#777]">
              {round(before.tMax)} / {round(before.tMin)}
            </p>
            <p className="text-[10px] text-[var(--color-ink-muted)]">
              💦 습도 {percent(before.humidity)}
              {before.rain ? <> · 💧{before.rain.toFixed(1)}mm</> : null}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold">
              최고 <Diff now={day.tMax} before={before.tMax} /> / 최저{' '}
              <Diff now={day.tMin} before={before.tMin} />
            </p>
          </>
        ) : (
          <p className="text-[10px] text-[#bbb]">자료 없음</p>
        )}
      </div>
    </button>
  );
}

export function WeeklyForecastPanel({
  location,
  forecast,
  lastYear,
  lastYearFailed,
  selectedDate,
  onSelectDate,
}: Props) {
  const today = forecast.days[0];
  const archiveByIndex = (index: number) => lastYear?.[index];
  const wind = windLevel(today?.windDay ?? today?.wind ?? null);

  return (
    <>
      {today ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
          <div className="rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]">
            <p className="text-xs font-bold">오늘 최고/최저</p>
            <p className="mt-1.5 text-[22px] leading-none font-extrabold">
              <span className="text-[var(--color-col-today)]">{round(today.tMax)}</span>
              <span className="mx-1 text-[#ccc]">/</span>
              <span className="text-[var(--color-col-month)]">{round(today.tMin)}</span>
            </p>
          </div>
          <div className="rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]">
            <p className="text-xs font-bold">습도 (낮/밤)</p>
            <p className="mt-1.5 text-[18px] leading-none font-extrabold">
              🌞{percent(today.humidityDay)} / 🌙{percent(today.humidityNight)}
            </p>
          </div>
          <div className="rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]">
            <p className="text-xs font-bold">최대풍속 (지상 10m, 낮/밤)</p>
            <p className="mt-1.5 text-[18px] leading-none font-extrabold">
              🌞{ms(today.windDay)} / 🌙{ms(today.windNight)}m/s{' '}
              {wind ? (
                <span className="text-[12px]" style={{ color: wind.color }}>
                  {wind.label}
                </span>
              ) : null}
            </p>
            {wind ? (
              <p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">{wind.note}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {lastYearFailed ? (
        <p className="mt-3 rounded-lg bg-[var(--color-col-yesterday-bg)] px-3 py-2 text-[11px] text-[var(--color-ink-muted)]">
          작년 비교 자료를 받지 못했습니다. 올해 예보는 그대로 보입니다.
        </p>
      ) : null}

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {forecast.days.map((day, index) => (
          <DayCard
            key={day.date}
            day={day}
            before={archiveByIndex(index)}
            selected={day.date === selectedDate}
            onSelect={() => onSelectDate(day.date)}
          />
        ))}
      </div>

      <p className="mt-1 text-[10px] leading-relaxed text-[#bbb]">
        기온 차이: ▲ 올해가 높음 · ▼ 올해가 낮음 · 풍속: 약(4미만) · 보통 · 강함(8↑) · 매우강함(14↑)
        · 단위 m/s · 날짜 카드를 누르면 시간대별 날씨
      </p>

      {selectedDate && forecast.hourly[selectedDate] ? (
        <HourStrip hours={forecast.hourly[selectedDate]} date={selectedDate} />
      ) : null}

      <p className="mt-3 text-[11px] text-[var(--color-ink-muted)]">
        {location.name} · Open-Meteo (ECMWF IFS) · 작년: ERA5 재분석
      </p>
    </>
  );
}
