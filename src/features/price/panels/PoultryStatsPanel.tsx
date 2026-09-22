import { Card, CardTitle } from '@/components/Card';
import {
  PanelError,
  PanelSkeleton,
  RefreshButton,
  SourceFooter,
  StaleBadge,
} from '@/components/PanelStatus';
import { useDataQuery } from '@/lib/useDataQuery';
import { formatDelta, formatNumber } from '@/lib/format';
import type { RegionStat, SpeciesStat } from '@/types/data/poultry_stats';

/**
 * 산란계·육계 사육 통계.
 *
 * 분기 통계라 "지금 얼마"보다 **"지난 분기보다 얼마나"** 가 실제로 읽히는
 * 정보다. 그래서 전국 요약에서도 마리수 옆에 증감률을 항상 붙이고,
 * 시도별 표에서도 비중과 증감을 같은 칸에 묶어 둔다.
 *
 * 마리수는 억 단위라 그대로 쓰면 자릿수를 세게 된다. 요약 카드에서는
 * '만 마리' 로 줄여 보여 주고, 정확한 값은 표에 남긴다.
 */

const SPECIES = [
  { key: 'layer', label: '산란계', icon: '🥚', accent: 'var(--color-brand-egg)' },
  { key: 'broiler', label: '육계', icon: '🐔', accent: 'var(--color-brand-poultry)' },
] as const satisfies readonly {
  key: 'layer' | 'broiler';
  label: string;
  icon: string;
  accent: string;
}[];

/** `78,985,355` -> `7,899만` — 요약에서 자릿수를 세지 않게 한다. */
function formatManBirds(birds: number | null | undefined): string {
  if (birds === null || birds === undefined) return '—';
  return `${formatNumber(Math.round(birds / 10000))}만`;
}

function Delta({ percent }: { percent: number | null | undefined }) {
  const delta = formatDelta(percent);
  if (delta.label === '–') return <span className="text-[var(--color-ink-muted)]">–</span>;
  const color =
    delta.direction === 'up'
      ? 'var(--color-col-today)'
      : delta.direction === 'down'
        ? 'var(--color-col-month)'
        : 'var(--color-ink-muted)';
  return (
    <span className="font-semibold" style={{ color }}>
      {delta.label}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  accent,
  stat,
  prevPeriod,
}: {
  icon: string;
  label: string;
  accent: string;
  stat: SpeciesStat;
  prevPeriod: string | null | undefined;
}) {
  return (
    <div className="min-w-0 rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]">
      <p className="text-xs leading-tight font-bold">
        <span aria-hidden className="mr-1">
          {icon}
        </span>
        {label}
      </p>

      <p className="mt-2 whitespace-nowrap">
        <span className="text-[22px] leading-none font-extrabold" style={{ color: accent }}>
          {formatManBirds(stat.birds)}
        </span>
        <span className="ml-0.5 text-[11px] font-semibold">마리</span>
        <span className="ml-1.5 text-[11px]">
          <Delta percent={stat.birds_pct} />
        </span>
      </p>

      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
        <dt className="text-[var(--color-ink-muted)]">농가</dt>
        <dd className="font-semibold">
          {formatNumber(stat.farms)}호 <Delta percent={stat.farms_pct} />
        </dd>
        <dt className="text-[var(--color-ink-muted)]">호당</dt>
        <dd className="font-semibold">{formatNumber(stat.per_farm)}마리</dd>
      </dl>

      {prevPeriod ? (
        <p className="mt-2 text-[10px] text-[var(--color-ink-muted)]">
          증감은 {prevPeriod} 대비 · 정확한 마리수 {formatNumber(stat.birds)}
        </p>
      ) : null}
    </div>
  );
}

function RegionCells({ stat, share }: { stat: SpeciesStat; share: number | null | undefined }) {
  return (
    <>
      <td className="border-l border-[var(--color-table-rule)] px-2 py-1.5 text-right text-[12px] font-semibold text-[#333]">
        {formatNumber(stat.birds)}
      </td>
      <td className="px-2 py-1.5 text-right text-[11px] text-[var(--color-ink-muted)]">
        {share === null || share === undefined ? '–' : `${share.toFixed(1)}%`}
      </td>
      <td className="px-2 py-1.5 text-right text-[11px]">
        <Delta percent={stat.birds_pct} />
      </td>
    </>
  );
}

function RegionRow({ region }: { region: RegionStat }) {
  return (
    <tr className="border-t border-[var(--color-table-rule)]">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left text-[11px] font-bold text-[#333] shadow-[6px_0_6px_-3px_rgb(0_0_0/0.35)]"
      >
        {region.name}
      </th>
      <RegionCells stat={region.layer} share={region.layer_share} />
      <RegionCells stat={region.broiler} share={region.broiler_share} />
    </tr>
  );
}

export function PoultryStatsPanel() {
  const { data, isPending, isFetching, error, refresh, refetch } = useDataQuery(
    'price/poultry_stats.json',
  );

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle icon="📈" note={data ? `${data.period} 기준` : '축산유통 통계누리'}>
          산란계·육계 사육 통계
        </CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          {data?.stale ? <StaleBadge fields={data.stale_fields} /> : null}
          <RefreshButton onClick={() => void refresh()} busy={isFetching} />
        </div>
      </div>

      {isPending ? <PanelSkeleton rows={4} /> : null}

      {error && !data ? (
        <PanelError message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
            {SPECIES.map((species) => (
              <SummaryCard
                key={species.key}
                icon={species.icon}
                label={`${species.label} 전국`}
                accent={species.accent}
                stat={data[species.key]}
                prevPeriod={data.prev_period}
              />
            ))}
          </div>

          {/* 7열이라 좁은 화면에서는 가로로 스크롤한다. '시도' 열은 고정하고
              그림자를 둬, 그 밑으로 지나가는 칸이 잘린 숫자로 읽히지 않게 한다. */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap">
              <caption className="sr-only">
                시도별 산란계·육계 사육 마리수와 전국 대비 비중, 직전 분기 대비 증감
              </caption>
              <thead>
                <tr className="bg-[var(--color-table-head)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-[var(--color-table-head)] px-2 py-1.5 text-left text-[11px] font-bold text-white shadow-[6px_0_6px_-3px_rgb(0_0_0/0.35)]"
                  >
                    시도
                  </th>
                  {SPECIES.map((species) => (
                    <th
                      key={species.key}
                      scope="colgroup"
                      colSpan={3}
                      className="border-l border-white/25 px-2 py-1.5 text-[11px] font-bold text-white"
                    >
                      {species.label}
                    </th>
                  ))}
                </tr>
                <tr className="bg-[var(--color-table-head)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-[var(--color-table-head)] px-2 py-1 text-left text-[10px] font-semibold text-white shadow-[6px_0_6px_-3px_rgb(0_0_0/0.35)]"
                  >
                    <span className="sr-only">시도 이름</span>
                  </th>
                  {SPECIES.map((species) => (
                    <Subhead key={species.key} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.regions.map((region) => (
                  <RegionRow key={region.name} region={region} />
                ))}
              </tbody>
            </table>
          </div>

          <SourceFooter
            note={`${data.table_name} · 분기 공시`}
            collectedAt={data.collected_at}
            sourceName="축산물품질평가원 축산유통 통계누리"
            sourceUrl={data.source_url}
          />
        </>
      ) : null}
    </Card>
  );
}

/** 축종마다 되풀이되는 세 칸 머리글. */
function Subhead() {
  return (
    <>
      <th
        scope="col"
        className="border-l border-white/25 px-2 py-1 text-right text-[10px] font-semibold text-white"
      >
        마리수
      </th>
      <th scope="col" className="px-2 py-1 text-right text-[10px] font-semibold text-white">
        비중
      </th>
      <th scope="col" className="px-2 py-1 text-right text-[10px] font-semibold text-white">
        전분기비
      </th>
    </>
  );
}
