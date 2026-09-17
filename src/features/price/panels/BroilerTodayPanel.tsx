import { Card, CardTitle } from '@/components/Card';
import {
  PanelError,
  PanelSkeleton,
  RefreshButton,
  SourceFooter,
  StaleBadge,
} from '@/components/PanelStatus';
import { useDataQuery } from '@/lib/useDataQuery';
import { formatNumber } from '@/lib/format';
import type { BroilerRow } from '@/types/data/broiler_price_today';

/**
 * 대한양계협회 홈페이지의 '금일 육계시세'.
 *
 * 축산물품질평가원(다봄) 시세와는 출처가 다른 협회 자체 공시가라
 * 원본과 마찬가지로 별도 패널로 둔다. 두 값이 다를 때 사용자가
 * 어느 쪽 숫자를 보고 있는지 헷갈리지 않는 것이 중요하다.
 */

/** 열 정의를 한 곳에 둔다. 색은 원본 표에서 그대로 가져온 값이다. */
const COLUMNS = [
  { key: 'today', label: '금일', text: 'var(--color-col-today)', bg: 'var(--color-col-today-bg)' },
  {
    key: 'yesterday',
    label: '전일',
    text: 'var(--color-col-yesterday)',
    bg: 'var(--color-col-yesterday-bg)',
  },
  {
    key: 'last_month',
    label: '전월',
    text: 'var(--color-col-month)',
    bg: 'var(--color-col-month-bg)',
  },
  {
    key: 'last_year',
    label: '전년',
    text: 'var(--color-col-year)',
    bg: 'var(--color-col-year-bg)',
  },
] as const satisfies readonly {
  key: keyof Pick<BroilerRow, 'today' | 'yesterday' | 'last_month' | 'last_year'>;
  label: string;
  text: string;
  bg: string;
}[];

export function BroilerTodayPanel() {
  const { data, isPending, isFetching, error, refresh, refetch } = useDataQuery(
    'price/broiler_today.json',
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardTitle icon="🐔" note="대한양계협회">
          금일 육계시세
        </CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          {data?.stale ? <StaleBadge fields={data.stale_fields} /> : null}
          <RefreshButton onClick={() => void refresh()} busy={isFetching} />
        </div>
      </div>

      {isPending ? <PanelSkeleton rows={5} /> : null}

      {error && !data ? (
        <PanelError message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <caption className="sr-only">
                금일 육계시세: 대·중·소·병아리 규격별 금일·전일·전월·전년 시세
              </caption>
              <thead>
                <tr className="bg-[var(--color-table-head)]">
                  <th scope="col" className="px-1.5 py-2 text-[11px] font-bold text-white">
                    {data.date_label}
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="px-1.5 py-2 text-[11px] font-bold"
                      style={{ color: column.text, backgroundColor: column.bg }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.grade} className="border-t border-[var(--color-table-rule)]">
                    <th
                      scope="row"
                      className="px-1.5 py-2 text-xs font-bold text-[#333]"
                      title={row.spec ?? undefined}
                    >
                      {row.grade}
                    </th>
                    {COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className="px-1.5 py-2 text-[13px] font-extrabold"
                        style={{ color: column.text, backgroundColor: column.bg }}
                      >
                        {formatNumber(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SourceFooter
            note={data.note}
            collectedAt={data.collected_at}
            sourceName="대한양계협회"
            sourceUrl={data.source_url}
          />
        </>
      ) : null}
    </Card>
  );
}
