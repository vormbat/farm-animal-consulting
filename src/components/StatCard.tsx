import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 시세 카드 한 장.
 *
 * 값 하나를 크게 보여주고 그 아래에 "언제 것인지"와 "어떤 주기의 공시인지"를
 * 붙인다. 이 두 줄이 이 화면에서 제일 중요한 정보다 — 산란계 관련 시세는
 * 항목마다 공시 주기가 일·주·월로 달라서, 날짜 없이 숫자만 보면
 * 오늘 값인지 지난달 값인지 알 수 없다.
 */
export interface StatCardProps {
  icon: string;
  label: string;
  /** 제목 옆 작은 보조 설명. 예: 전국(XL) */
  sub?: string | undefined;
  value: ReactNode;
  unit?: string | undefined;
  /** 값 아래 한 줄. 예: 개당 210원 · 30개(판) 6,295원 */
  detail?: ReactNode;
  /** 원문 공시 시점 */
  date?: string | null | undefined;
  /** 공시 주기 설명. 예: 전월 실적(월 공시) */
  note?: string | undefined;
  /** 강조색 */
  accent: string;
  /** 이 카드의 값이 이번 수집에서 갱신되지 못했을 때 */
  stale?: boolean | undefined;
}

export function StatCard({
  icon,
  label,
  sub,
  value,
  unit,
  detail,
  date,
  note,
  accent,
  stale = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[14px] border-2 bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]',
        stale ? 'border-dashed border-black/15' : 'border-transparent',
      )}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-lg leading-none">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-tight font-bold break-words">
            {label}
            {sub ? (
              <span className="ml-1 font-medium text-[var(--color-ink-muted)]">{sub}</span>
            ) : null}
          </p>
        </div>
      </div>

      <p className="mt-2 whitespace-nowrap">
        <span className="text-[22px] leading-none font-extrabold" style={{ color: accent }}>
          {value}
        </span>
        {unit ? <span className="ml-0.5 text-[11px] font-semibold">{unit}</span> : null}
      </p>

      {detail ? (
        <p className="mt-1 text-[11px] break-words text-[var(--color-ink-muted)]">{detail}</p>
      ) : null}

      <div className="mt-2 text-[10px] leading-snug text-[var(--color-ink-muted)]">
        {date ? <p>{date}</p> : null}
        {note ? <p>{stale ? `${note} · 갱신 실패, 이전 값` : note}</p> : null}
      </div>
    </div>
  );
}
