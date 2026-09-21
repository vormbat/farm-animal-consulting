import { useState } from 'react';
import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton } from '@/components/PanelStatus';
import { BROILER_TARGET_TEMP, LAYER_TARGET_TEMP, PIG_TARGET_TEMP } from '@/data/target-temp';
import { summarizeToday } from '@/lib/climate';
import { humidityAdjustment } from '@/lib/livestock-weather';
import { useFarmLocation } from '@/lib/location';
import { useForecast, useLastYear } from '@/lib/weather-api';
import { HusbandryPointsPanel } from './panels/HusbandryPointsPanel';
import { LocationPicker } from './panels/LocationPicker';
import { SolarTermPanel } from './panels/SolarTermPanel';
import { StressIndexPanel } from './panels/StressIndexPanel';
import { TargetTempPanel, type TargetRow } from './panels/TargetTempPanel';
import { WeeklyForecastPanel } from './panels/WeeklyForecastPanel';
import { useCurrentPosition } from './useCurrentPosition';

/**
 * 날씨 탭.
 *
 * 위에서 아래로 "오늘이 어떤 날인가 → 이번 주 날씨 → 가축에게 어떤 뜻인가 →
 * 그래서 무엇을 할 것인가" 순으로 좁혀 간다. 절기 카드만 위치와 무관하게 늘
 * 보이고, 나머지는 농장 위치를 고른 뒤에야 뜻이 있다.
 *
 * 위치는 환기가이드 탭도 함께 쓴다(`src/lib/location.ts`).
 */

/** 산란계 표는 권장 범위를 함께 싣고, 육추기에만 습도 보정을 적용한다. */
function layerRows(adjustment: number): TargetRow[] {
  return LAYER_TARGET_TEMP.map((row) => ({
    label: row.wk,
    target: row.stage === '육추' ? row.t - adjustment : row.t,
    sub: `(${row.range}°)`,
    group: row.stage,
  }));
}

export default function WeatherTab() {
  const location = useFarmLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const forecast = useForecast(location);
  const lastYear = useLastYear(location);
  const { detect, busy, error: gpsError } = useCurrentPosition();

  const climate = forecast.data ? summarizeToday(forecast.data) : null;
  const activeDate = selectedDate ?? forecast.data?.days[0]?.date ?? null;
  const outside = climate?.tMax ?? null;
  const adjustment = humidityAdjustment(climate?.meanHumidity ?? null);

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

      {climate && forecast.data ? (
        <Card>
          <CardTitle icon="🌡️">축산 날씨 스트레스 지표</CardTitle>
          <StressIndexPanel climate={climate} forecast={forecast.data} />

          {outside !== null ? (
            <>
              <TargetTempPanel
                icon="🐔"
                title="육계 일령별 목표온도 vs 오늘 최고기온"
                outsideTemp={outside}
                accent="#E8530A"
                rows={BROILER_TARGET_TEMP.map((row) => ({ label: row.day, target: row.t }))}
                note="밀폐형 계사 기준"
                source="Aviagen 브로일러 가이드라인"
              />

              <TargetTempPanel
                icon="🥚"
                title="산란계 주령별 목표온도 vs 오늘 최고기온"
                outsideTemp={outside}
                accent="#D4A012"
                rows={layerRows(adjustment)}
                adjustment={adjustment > 0 ? `습도보정 -${adjustment}°C 적용` : undefined}
                note="입추 33~36°C → 1주 후부터 매주 2~3°C 하향 → 21°C 도달 · 산란기 정상범위 21~27°C · 습도 보정: 상대습도 60% 초과 시 5%p당 1°C 하향(육추기)"
                source="Hy-Line Commercial Layer Management Guide"
              />

              <TargetTempPanel
                icon="🐷"
                title="양돈 구간별 목표돈사온도 vs 오늘 최고기온"
                outsideTemp={outside}
                accent="#6D4C41"
                rows={PIG_TARGET_TEMP.map((row) => ({
                  label: row.stage,
                  target: row.t,
                  // 양돈은 주령과 체중을 같이 봐야 어느 구간인지 짚인다.
                  sub: `${row.wk} · ${row.weight}`,
                }))}
                note="밀폐형 돈사·톱밥깔짚 기준"
                source="PIC 2019 Wean to Finish Guidelines, Appendix A"
              />
            </>
          ) : null}

          <p className="mt-3 text-right text-[10px] text-[#aaa]">
            THI 공식: USDA/Clemson Univ. · 육계: Aviagen Broiler Guide · 산란계: Hy-Line Layer
            Management Guide · 양돈: PIC Wean to Finish Guidelines
          </p>
        </Card>
      ) : null}

      {climate && location ? (
        <HusbandryPointsPanel climate={climate} locationName={location.name} />
      ) : null}

      <LocationPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
