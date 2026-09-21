import { Card, CardTitle } from '@/components/Card';
import { HUMIDITY_THRESHOLD, recommend } from '@/lib/ventilation';
import type { Forecast } from '@/lib/weather-api';
import type { VentStage } from './StageDetail';

/**
 * 7일 환기단계 예보.
 *
 * 오늘 단계만 알면 준비가 늦는다. 모레 터널로 넘어갈 것이 보이면 오늘 패드를
 * 시운전해 둘 수 있다. 습도 때문에 올라간 날은 따로 표시해, 팬을 더 돌릴 일인지
 * 제습을 볼 일인지 구분되게 한다.
 */

interface Props {
  forecast: Forecast;
  stages: readonly VentStage[];
  targetTemp: number;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const;

function dayLabel(date: string, isToday: boolean): string {
  if (isToday) return '오늘';
  const [year, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAY[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()];
  return `${weekday} ${month}/${day}`;
}

export function WeekOutlook({ forecast, stages, targetTemp }: Props) {
  const today = forecast.days[0]?.date;

  return (
    <Card>
      <CardTitle icon="📅" note={`💧는 습도(${HUMIDITY_THRESHOLD}%↑)로 단계가 상향된 날`}>
        7일 환기단계 예보
      </CardTitle>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {forecast.days.map((day) => {
          if (day.tMax === null) return null;
          const humidity = day.humidity === null ? null : Math.round(day.humidity);
          const advice = recommend(day.tMax, targetTemp, humidity);
          const stage = stages[advice.stage]!;
          return (
            <div
              key={day.date}
              className="min-w-[96px] flex-1 rounded-xl border-t-[3px] bg-[#FAFAFA] px-2 py-2.5 text-center"
              style={{ borderTopColor: stage.color }}
            >
              <p className="text-[10px] font-semibold text-[var(--color-ink-muted)]">
                {dayLabel(day.date, day.date === today)}
              </p>
              <p className="text-[15px] font-extrabold">{Math.round(day.tMax)}°</p>
              <p
                className="mt-0.5 text-[10px] leading-tight font-bold"
                style={{ color: stage.color }}
              >
                {stage.icon} {stage.name}
                {advice.humidityDriven ? ' 💧' : ''}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
