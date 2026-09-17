import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** 원본의 `.card` — 흰 배경, 16px 라운드, 옅은 그림자. */
export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

interface CardTitleProps {
  icon?: string;
  children: ReactNode;
  /** 제목 옆에 작게 붙는 보조 문구 (예: 출처, 수집 시각) */
  note?: ReactNode;
}

export function CardTitle({ icon, children, note }: CardTitleProps) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <h2 className="display text-base">
        {icon ? `${icon} ` : ''}
        {children}
      </h2>
      {note ? <span className="text-[11px] text-[var(--color-ink-muted)]">{note}</span> : null}
    </div>
  );
}
