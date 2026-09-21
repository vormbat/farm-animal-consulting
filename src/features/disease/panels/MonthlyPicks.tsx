import { useMemo } from 'react';
import { Card, CardTitle } from '@/components/Card';
import type { MonthlyPicks as Picks } from '@/types/editorial';
import type { Disease } from '@/types/data/disease';

/**
 * 이달의 질병.
 *
 * 편집자가 저장소의 `data/disease/monthly-picks.json` 을 고쳐 발행한다.
 * 원본에는 화면에서 GitHub 토큰으로 직접 커밋하는 기능이 있었지만 재현하지
 * 않는다 — 토큰이 브라우저에 남으면 저장소 쓰기 권한이 그대로 넘어간다
 * (docs/decisions/0001).
 *
 * 지난달까지 함께 보여 주는 이유는, 같은 병이 두 달 연속 지목됐다는 사실 자체가
 * 정보이기 때문이다. 누적 횟수를 따로 세어 그것을 드러낸다.
 */

interface Props {
  picks: Picks;
  bySlug: Map<string, Disease>;
  /** 사전에서 그 질병을 펼쳐 보여 준다 */
  onOpen: (slug: string) => void;
}

/** `2026-09` -> `2026년 9월` */
function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${year}년 ${Number(month)}월`;
}

function currentMonthKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

export function MonthlyPicks({ picks, bySlug, onOpen }: Props) {
  const months = useMemo(
    () => Object.keys(picks.picks).sort((a, b) => b.localeCompare(a)),
    [picks.picks],
  );

  const tally = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();
    for (const rows of Object.values(picks.picks)) {
      for (const row of rows) {
        if (!row.slug) continue;
        const title = bySlug.get(row.slug)?.title_ko ?? row.slug;
        const previous = counts.get(row.slug);
        counts.set(row.slug, { title, count: (previous?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ko'),
    );
  }, [picks.picks, bySlug]);

  const thisMonth = currentMonthKey();

  if (months.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle icon="📌">{picks.by}가 짚어주는 이달의 질병</CardTitle>
        <span className="text-[11px] text-[var(--color-ink-muted)]">발행 {picks.updated}</span>
      </div>

      <div className="space-y-4">
        {months.map((month) => {
          const rows = picks.picks[month] ?? [];
          if (rows.length === 0) return null;
          const isThisMonth = month === thisMonth;
          return (
            <section key={month}>
              <h3 className="mb-1.5 text-[12px] font-bold">
                {monthLabel(month)}
                <span className="ml-1.5 font-medium text-[var(--color-ink-muted)]">
                  {isThisMonth ? `이번달 ${rows.length}건` : `${rows.length}건`}
                </span>
              </h3>
              <ol className="space-y-1.5">
                {rows.map((row, index) => {
                  const disease = row.slug ? bySlug.get(row.slug) : undefined;
                  return (
                    <li key={`${month}-${index}`} className="flex gap-2">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-egg-bg)] text-[10px] font-bold text-[#8a6508]"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        {disease ? (
                          <button
                            type="button"
                            onClick={() => onOpen(disease.slug)}
                            className="text-left text-[13px] font-bold underline-offset-2 hover:underline"
                          >
                            {disease.title_ko}
                            <span className="ml-1.5 text-[10px] font-medium text-[var(--color-ink-muted)]">
                              {disease.title_en}
                            </span>
                          </button>
                        ) : (
                          <p className="text-[13px] font-bold">
                            {row.title ?? row.slug}
                            <span className="ml-1.5 text-[10px] font-medium text-[var(--color-ink-muted)]">
                              (사전에 없는 주제)
                            </span>
                          </p>
                        )}
                        {row.note ? (
                          <p className="text-[11px] text-[var(--color-ink-muted)]">{row.note}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      {tally.length > 0 ? (
        <div className="mt-4 border-t border-black/[0.06] pt-3">
          <p className="mb-1.5 text-[11px] font-bold">누적 — 많이 지목된 질병</p>
          <div className="flex flex-wrap gap-1.5">
            {tally.map((row) => (
              <span
                key={row.title}
                className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-semibold"
              >
                {row.title}
                <span className="ml-1 text-[var(--color-ink-muted)]">{row.count}회</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-[var(--color-ink-muted)]">{picks.note}</p>
    </Card>
  );
}
