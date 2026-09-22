import { Card } from '@/components/Card';
import { inkFrom } from '@/lib/utils';
import type { Outlet } from '../outlets';

/**
 * 매체 한 곳의 최신 기사 카드.
 *
 * 원본은 매체마다 카드 HTML 을 통째로 복사해 두어 여섯 벌이 있었고, 그래서
 * 매체를 하나 늘릴 때마다 색·여백이 조금씩 어긋났다. 여기서는 하나뿐이다.
 */

interface Props {
  outlet: Outlet;
  /** 이번 수집에서 갱신되지 못하고 직전 기사가 그대로 남았는지 */
  stale: boolean;
}

export function OutletCard({ outlet, stale }: Props) {
  return (
    <Card className="flex flex-col border-t-4 p-4" style={{ borderTopColor: outlet.color }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-xl">
            {outlet.icon}
          </span>
          <div className="min-w-0">
            <p className="display truncate text-sm" style={{ color: inkFrom(outlet.color) }}>
              {outlet.name}
            </p>
            <p className="truncate text-[10px] text-[var(--color-ink-muted)]">{outlet.note}</p>
          </div>
        </div>
        <a
          href={outlet.home}
          target="_blank"
          rel="noreferrer noopener"
          className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold"
          style={{ color: inkFrom(outlet.color), borderColor: outlet.color }}
        >
          전체 ↗
        </a>
      </div>

      {outlet.items.length === 0 ? (
        <p className="py-5 text-center text-[11px] text-[var(--color-ink-muted)]">📭 기사 없음</p>
      ) : (
        <ol>
          {outlet.items.map((item, index) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                // 번역된 제목이 미심쩍을 때 원문을 바로 확인할 수 있게 한다.
                title={item.title_en ?? undefined}
                className="flex items-start gap-2 border-b border-black/[0.05] py-2.5 last:border-b-0 hover:bg-black/[0.015]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 w-[14px] shrink-0 text-[10px] font-extrabold opacity-70"
                  style={{ color: inkFrom(outlet.color) }}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] leading-relaxed font-semibold break-keep">
                    {item.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-ink-muted)]">
                    {(item.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--color-col-today-bg)] px-1.5 font-bold text-[var(--color-col-today)]"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.source ? <span className="font-semibold">{item.source}</span> : null}
                    {item.date ? <span>{item.date}</span> : null}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-[11px] text-black/25">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      {stale ? (
        <p className="mt-2 rounded-md bg-[var(--color-col-yesterday-bg)] px-2 py-1 text-[10px] text-[var(--color-ink-muted)]">
          ⚡ 이번 수집에 실패해 직전 기사를 그대로 보여 주고 있습니다.
        </p>
      ) : null}
    </Card>
  );
}
