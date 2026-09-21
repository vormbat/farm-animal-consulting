import { useState } from 'react';
import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton } from '@/components/PanelStatus';
import { useFarmLocation } from '@/lib/location';
import { useForecast, useLastYear } from './api';
import { LocationPicker } from './panels/LocationPicker';
import { useCurrentPosition } from './useCurrentPosition';
import { SolarTermPanel } from './panels/SolarTermPanel';
import { WeeklyForecastPanel } from './panels/WeeklyForecastPanel';

/**
 * 날씨 탭.
 *
 * 절기 카드는 위치와 무관하게 늘 보인다. 그 아래는 농장 위치를 고른 뒤에야
 * 뜻이 있으므로, 고르지 않았으면 예보 대신 위치를 고르라는 안내를 둔다.
 *
 * 위치는 환기가이드 탭도 함께 쓴다(`src/lib/location.ts`).
 */
export default function WeatherTab() {
  const location = useFarmLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const forecast = useForecast(location);
  const lastYear = useLastYear(location);
  const { detect, busy, error: gpsError } = useCurrentPosition();

  // 위치를 바꾸면 고른 날짜는 뜻을 잃는다. 첫날로 되돌린다.
  const activeDate = selectedDate ?? forecast.data?.days[0]?.date ?? null;

  return (
    <div className="space-y-4">
      <SolarTermPanel />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle icon="🌤️" note={location ? location.name : undefined}>
            주간 날씨 · 올해 vs 작년 비교
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={detect}
              disabled={busy}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03] disabled:opacity-50"
            >
              {busy ? '찾는 중…' : '📍 내 위치'}
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
            >
              🔍 {location ? '지역변경' : '지역 선택'}
            </button>
          </div>
        </div>

        {gpsError ? (
          <p className="mb-3 rounded-lg bg-[var(--color-col-today-bg)] px-3 py-2 text-xs text-[var(--color-col-today)]">
            {gpsError}
          </p>
        ) : null}

        {!location ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            GPS로 현재 위치를 감지하거나, 지역명을 직접 입력하세요.
          </p>
        ) : forecast.isPending ? (
          <PanelSkeleton rows={4} />
        ) : forecast.error ? (
          <PanelError message={forecast.error.message} onRetry={() => void forecast.refetch()} />
        ) : forecast.data ? (
          <WeeklyForecastPanel
            location={location}
            forecast={forecast.data}
            lastYear={lastYear.data}
            lastYearFailed={lastYear.isError}
            selectedDate={activeDate}
            onSelectDate={setSelectedDate}
          />
        ) : null}
      </Card>

      <LocationPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
