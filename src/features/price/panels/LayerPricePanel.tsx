import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton, RefreshButton, SourceFooter } from '@/components/PanelStatus';
import { StatCard } from '@/components/StatCard';
import { useDataQuery } from '@/lib/useDataQuery';
import { formatNumber } from '@/lib/format';
import type { LayerPrice, PriceSeries } from '@/types/data';

/**
 * 산란계 관련시세 카드.
 *
 * 세 값의 공시 주기가 서로 달라(계란=일, 초생추=월, 산란노계=주) 같은 날
 * 나란히 놓아도 가리키는 시점이 다르다. 그래서 카드마다 원문 공시일과
 * 주기 설명을 반드시 함께 보여준다.
 */

const PERIOD_NOTE: Record<PriceSeries['period'], string> = {
  day: '일 공시',
  week: '전주 실적(주 공시)',
  month: '전월 실적(월 공시)',
};

const ACCENT = {
  egg: '#d4a012',
  chick: '#f9a825',
  oldHen: '#8d6e63',
} as const;

/** 월 공시는 `2026-08`, 나머지는 `2026-09-07` 그대로 보여준다. */
function seriesCard(series: PriceSeries, icon: string, accent: string, stale: boolean) {
  return (
    <StatCard
      icon={icon}
      label={series.label}
      value={formatNumber(series.latest)}
      unit={series.unit}
      date={series.latest_date}
      note={PERIOD_NOTE[series.period]}
      accent={accent}
      stale={stale}
    />
  );
}

function EggDetail({ egg }: { egg: LayerPrice['egg'] }) {
  if (egg.latest_per_10 === null || egg.latest_per_10 === undefined) return null;
  const each = Math.round(egg.latest_per_10 / 10);
  return (
    <>
      개당 {formatNumber(each)}원
      {egg.latest_per_30 ? <> · 30개(판) {formatNumber(egg.latest_per_30)}원</> : null}
    </>
  );
}

export function LayerPricePanel() {
  const { data, isPending, isFetching, error, refresh, refetch } = useDataQuery('price/layer.json');

  const staleOf = (field: string) => data?.stale_fields?.includes(field) ?? false;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle icon="📊">산란계 관련시세</CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          {data ? (
            <a
              href={data.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
            >
              생산자 시세 ↗
            </a>
          ) : null}
          <RefreshButton onClick={() => void refresh()} busy={isFetching} />
        </div>
      </div>

      {isPending ? <PanelSkeleton rows={2} /> : null}

      {error && !data ? (
        <PanelError message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-2.5">
            <StatCard
              icon="🥚"
              label={data.egg.label}
              sub={`${data.egg.region}(XL)`}
              value={formatNumber(data.egg.latest_per_10)}
              unit="원/10개"
              detail={<EggDetail egg={data.egg} />}
              date={data.egg.latest_date}
              note="특란 기준"
              accent={ACCENT.egg}
              stale={staleOf('egg')}
            />
            {seriesCard(data.chick, '🐣', ACCENT.chick, staleOf('chick'))}
            {seriesCard(data.old_hen, '🐔', ACCENT.oldHen, staleOf('old_hen'))}
          </div>

          <SourceFooter
            note="카드 날짜는 원문 발표일"
            collectedAt={data.collected_at}
            sourceName="축산물품질평가원 다봄"
            sourceUrl={data.source_url}
          />
        </>
      ) : null}
    </Card>
  );
}
