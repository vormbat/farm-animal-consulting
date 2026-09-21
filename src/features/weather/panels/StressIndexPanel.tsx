import { THI_ZONES } from '@/data/heat-stress';
import type { TodayClimate } from '@/lib/climate';
import {
  calcTHI,
  diurnalLevel,
  thiLevel,
  thiPercent,
  windChillLevel,
} from '@/lib/livestock-weather';
import type { Forecast } from '@/lib/weather-api';

/**
 * 축산 날씨 스트레스 지표.
 *
 * 세 가지를 나란히 둔다. THI 는 더위, 일교차는 호흡기, 야간 THI 는 누적 열부하다.
 * 특히 **야간을 따로 보는 이유**는 밤에 열을 못 빼면 다음날 열부하가 쌓여
 * 낮 기온이 같아도 피해가 커지기 때문이다(가금은 새벽 2~5시가 취약하다).
 *
 * 겨울에는 THI 가 늘 '정상' 으로만 나온다. 기온이 낮은 날은 체감온도 칸을
 * 대신 띄운다 — 지표가 있는데 계절 때문에 늘 초록불이면 안 보는 것만 못하다.
 */

interface Props {
  climate: TodayClimate;
  forecast: Forecast;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const;

function dayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${month}/${day}(${WEEKDAY[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]})`;
}

function Metric({
  title,
  value,
  levelLabel,
  color,
  note,
  percent,
}: {
  title: string;
  value: string;
  levelLabel: string;
  color: string;
  note: string;
  percent?: number;
}) {
  return (
    <div className="rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]">
      <p className="text-xs font-bold">{title}</p>
      <p className="mt-1.5 text-[22px] leading-none font-extrabold" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold" style={{ color }}>
        {levelLabel}
      </p>
      {percent !== undefined ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-black/[0.07]">
          <div className="h-full rounded" style={{ width: `${percent}%`, background: color }} />
        </div>
      ) : null}
      <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-ink-muted)]">{note}</p>
    </div>
  );
}

export function StressIndexPanel({ climate, forecast }: Props) {
  const day = thiLevel(climate.thi);
  const night = thiLevel(climate.nightThi);
  const diurnal = diurnalLevel(climate.diurnal);
  const cold = windChillLevel(climate.windChill);

  // 7일 추이는 일 최고기온 + 일 평균습도로 낸다. 시간대별을 쓰면 오늘만
  // 정밀해지고 나머지 엿새와 눈금이 달라져 오히려 비교가 안 된다.
  const week = forecast.days.map((entry) => ({
    date: entry.date,
    thi: calcTHI(entry.tMax, entry.humidity ?? 70),
    rain: entry.rain ?? 0,
  }));

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
        {day ? (
          <Metric
            title="온습도지수 (THI)"
            value={String(climate.thi)}
            levelLabel={`${day.icon} ${day.label}`}
            color={day.color}
            percent={thiPercent(climate.thi)}
            note="한낮 가장 가혹한 시간대 기준"
          />
        ) : null}

        {diurnal ? (
          <Metric
            title="일교차"
            value={`${climate.diurnal}°`}
            levelLabel={`${diurnal.icon} ${diurnal.label}`}
            color={diurnal.color}
            note="호흡기·면역 저하 위험 · 8°↑주의 / 12°↑경보"
          />
        ) : null}

        {night ? (
          <Metric
            title="야간 THI (새벽 3~5시)"
            value={String(climate.nightThi)}
            levelLabel={`${night.icon} ${night.label}`}
            color={night.color}
            percent={thiPercent(climate.nightThi)}
            note="밤에 식지 않으면 다음날 열부하가 쌓인다 (가금 새벽 2~5시 취약)"
          />
        ) : null}

        {cold ? (
          <Metric
            title="체감온도 (윈드칠)"
            value={`${climate.windChill}°`}
            levelLabel={`${cold.icon} ${cold.label}`}
            color={cold.color}
            note={cold.note}
          />
        ) : null}
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-bold">
          📊 7일 THI 추이{' '}
          <span className="font-medium text-[var(--color-ink-muted)]">일 최고 기준 · 💧=강수</span>
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {week.map((entry) => {
            const level = thiLevel(entry.thi);
            const isToday = entry.date === climate.date;
            return (
              <div key={entry.date} className="min-w-0 flex-1 text-center">
                <div className="flex h-16 items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(6, thiPercent(entry.thi))}%`,
                      background: level?.color ?? '#ddd',
                      opacity: isToday ? 1 : 0.65,
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-bold" style={{ color: level?.color }}>
                  {entry.thi ?? '—'}
                </p>
                <p className="truncate text-[9px] text-[var(--color-ink-muted)]">
                  {dayLabel(entry.date)}
                </p>
                <p className="text-[9px]">{entry.rain > 0 ? '💧' : ' '}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {THI_ZONES.map((zone) => (
            <span key={zone.label} className="text-[9px] text-[var(--color-ink-muted)]">
              <span
                aria-hidden
                className="mr-1 inline-block h-2 w-2 rounded-[2px] align-middle"
                style={{ background: zone.color }}
              />
              {zone.range} {zone.label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
