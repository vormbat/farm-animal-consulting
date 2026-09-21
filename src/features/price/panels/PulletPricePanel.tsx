import { Card, CardTitle } from '@/components/Card';
import {
  PanelError,
  PanelSkeleton,
  RefreshButton,
  SourceFooter,
  StaleBadge,
} from '@/components/PanelStatus';
import { StatCard } from '@/components/StatCard';
import { useDataQuery } from '@/lib/useDataQuery';
import { formatDelta, formatNumber } from '@/lib/format';
import type { PulletPrice, PulletYear } from '@/types/data/pullet_price';

/**
 * 산란계 중추(中雛)가격.
 *
 * 협회가 표를 그림으로만 올려서 이 숫자들은 OCR 로 읽은 값이다. 원문 표에
 * 인쇄된 '평균' 열과 맞는지 검산한 뒤에만 실리지만(안 맞으면 수집이 이전 값을
 * 유지한다), 그래도 사람이 곧바로 대조할 수 있도록 **원문 이미지 링크를
 * 항상 눈에 띄게 둔다.** 자동으로 읽은 숫자라는 사실을 숨기지 않는 편이 낫다.
 */

const ACCENT = '#7b5e2a';
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/** 작년 같은 달 대비. 중추는 계절성이 커서 전월보다 전년 동월이 읽기 쉽다. */
function yearOverYear(data: PulletPrice): number | null {
  const previous = data.years.find((row) => row.year === data.latest_year - 1);
  const before = previous?.months[data.latest_month - 1];
  if (before === null || before === undefined || before === 0) return null;
  return ((data.latest - before) / before) * 100;
}

function YearRow({ row, latest }: { row: PulletYear; latest: { year: number; month: number } }) {
  return (
    <tr className="border-t border-[var(--color-table-rule)]">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-white px-2 py-1.5 text-[11px] font-bold text-[#333] shadow-[6px_0_6px_-3px_rgb(0_0_0/0.35)]"
      >
        {row.year}
      </th>
      {row.months.map((value, index) => {
        const isLatest = row.year === latest.year && index + 1 === latest.month;
        return (
          <td
            key={index}
            className={
              isLatest
                ? 'bg-[var(--color-col-today-bg)] px-2 py-1.5 text-[12px] font-extrabold text-[var(--color-col-today)]'
                : 'px-2 py-1.5 text-[12px] text-[#444]'
            }
          >
            {value === null ? '' : formatNumber(value)}
          </td>
        );
      })}
      <td className="bg-[var(--color-col-year-bg)] px-2 py-1.5 text-[12px] font-bold text-[var(--color-col-year)]">
        {formatNumber(row.average)}
      </td>
    </tr>
  );
}

export function PulletPricePanel() {
  const { data, isPending, isFetching, error, refresh, refetch } =
    useDataQuery('price/pullet.json');

  const delta = data ? formatDelta(yearOverYear(data)) : null;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle icon="🐥" note="대한산란계협회">
          산란계 중추가격
        </CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          {data?.stale ? <StaleBadge fields={data.stale_fields} /> : null}
          {data ? (
            <a
              href={data.image_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
            >
              원문 표 이미지 ↗
            </a>
          ) : null}
          <RefreshButton onClick={() => void refresh()} busy={isFetching} />
        </div>
      </div>

      {isPending ? <PanelSkeleton rows={4} /> : null}

      {error && !data ? (
        <PanelError message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
            <StatCard
              icon="🐥"
              label="산란계 중추"
              value={formatNumber(data.latest)}
              unit={data.unit}
              detail={
                delta && delta.label !== '–' ? (
                  <>전년 동월 대비 {delta.label}</>
                ) : (
                  <>전년 동월 자료 없음</>
                )
              }
              date={`${data.latest_year}년 ${data.latest_month}월`}
              note="월 공시"
              accent={ACCENT}
              stale={data.stale}
            />
          </div>

          {/* 14열이라 좁은 화면에서는 가로로 스크롤한다. '연도' 열은 고정해
              오른쪽 달을 보다가도 어느 해인지 잃지 않게 한다. 고정 열 밑으로
              칸이 지나가므로 그림자를 둬 '가려진 것'임을 드러낸다 — 그림자가
              없으면 반쯤 가려진 숫자가 그 열의 값처럼 읽힌다.
              컨테이너에 좌우 패딩을 두면 고정 열 왼쪽에 틈이 생겨 그리로
              다른 칸이 비쳐 보이므로 패딩은 두지 않는다. */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-center whitespace-nowrap">
              <caption className="sr-only">연도별 월별 산란계 중추가격(원/마리)</caption>
              <thead>
                <tr className="bg-[var(--color-table-head)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-[var(--color-table-head)] px-2 py-1.5 text-[11px] font-bold text-white shadow-[6px_0_6px_-3px_rgb(0_0_0/0.35)]"
                  >
                    연도
                  </th>
                  {MONTHS.map((month) => (
                    <th
                      key={month}
                      scope="col"
                      className="px-2 py-1.5 text-[11px] font-bold text-white"
                    >
                      {month}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-1.5 text-[11px] font-bold text-white">
                    평균
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.years.map((row) => (
                  <YearRow
                    key={row.year}
                    row={row}
                    latest={{ year: data.latest_year, month: data.latest_month }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <SourceFooter
            note="원문 표 이미지를 자동으로 읽어 평균 열로 검산한 값 (단위 원/마리)"
            collectedAt={data.collected_at}
            sourceName="대한산란계협회"
            sourceUrl={data.post_url}
          />
        </>
      ) : null}
    </Card>
  );
}
