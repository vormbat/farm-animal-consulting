import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 패널 공통 상태 표시.
 *
 * 원본은 패널마다 로딩·오류 문구를 따로 만들어 문구와 모양이 조금씩 달랐다.
 * 여기 모아 두면 패널이 늘어도 사용자가 보는 상태 표현은 일정하다.
 */

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-8 animate-pulse rounded bg-black/5"
          style={{ width: `${100 - index * 8}%` }}
        />
      ))}
    </div>
  );
}

interface PanelErrorProps {
  message: string;
  onRetry?: (() => void) | undefined;
}

export function PanelError({ message, onRetry }: PanelErrorProps) {
  return (
    <div className="rounded-xl bg-[var(--color-col-today-bg)] p-4 text-sm">
      <p className="font-semibold text-[var(--color-col-today)]">데이터를 불러오지 못했습니다</p>
      <p className="mt-1 text-[var(--color-ink-muted)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

/**
 * 이 패널의 값이 이번 수집에서 갱신되지 못하고 이전 값으로 남았을 때.
 * 값을 감추지 않고 "언제 것인지"만 덧붙이는 것이 원본의 태도이고, 그대로 따른다.
 */
export function StaleBadge({ fields }: { fields?: readonly string[] | undefined }) {
  const detail = fields && fields.length > 0 ? ` (${fields.join(', ')})` : '';
  return (
    <span className="rounded-full bg-[var(--color-col-yesterday-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-muted)]">
      갱신 실패 · 이전 값{detail}
    </span>
  );
}

interface SourceFooterProps {
  /** 표 아래 안내 문구 등, 출처보다 앞에 붙는 설명 */
  note?: ReactNode;
  collectedAt: string;
  sourceName: string;
  sourceUrl?: string;
  className?: string;
}

export function SourceFooter({
  note,
  collectedAt,
  sourceName,
  sourceUrl,
  className,
}: SourceFooterProps) {
  return (
    <p className={cn('mt-3 text-[11px] leading-relaxed text-[var(--color-ink-muted)]', className)}>
      {note ? <>{note} · </> : null}
      수집 {collectedAt} · 출처:{' '}
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2"
        >
          {sourceName} ↗
        </a>
      ) : (
        sourceName
      )}
    </p>
  );
}

interface RefreshButtonProps {
  onClick: () => void;
  busy?: boolean;
}

export function RefreshButton({ onClick, busy = false }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] transition-colors hover:bg-black/[0.03] disabled:opacity-50"
    >
      {busy ? '갱신 중…' : '🔄 갱신'}
    </button>
  );
}
