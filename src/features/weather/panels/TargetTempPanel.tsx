/**
 * 사육단계별 목표온도 vs 오늘 최고기온.
 *
 * 축종마다 표가 다르지만 보는 방식은 같다 — "지금 바깥 기온이 이 단계의
 * 목표보다 높은가 낮은가". 그래서 컴포넌트 하나로 세 축종을 다 그린다.
 *
 * ▲(빨강)는 목표 초과라 과열 주의, ▼(파랑)는 미달이라 보온 필요다.
 * 축산에서 붉은 쪽이 더움을 뜻하는 관례를 그대로 따른다.
 */

export interface TargetRow {
  /** 단계 이름. `1~3일` `18주~ 산란` `비육 후기(출하)` */
  label: string;
  /** 목표온도(°C) */
  target: number;
  /** 카드 둘째 줄. 권장 범위나 체중 */
  sub?: string | undefined;
  /** 육추기/육성기/산란기처럼 구간을 색으로 나눌 때 */
  group?: string | undefined;
}

interface Props {
  icon: string;
  title: string;
  /** 비교 기준이 되는 오늘 기온 */
  outsideTemp: number;
  rows: TargetRow[];
  accent: string;
  /** 표 아래 설명과 출처 */
  note: string;
  source: string;
  /** 제목 옆 보조 문구 (예: 습도보정 -3°C 적용) */
  adjustment?: string | undefined;
}

function Gap({ target, outside }: { target: number; outside: number }) {
  const gap = Math.round(outside - target);
  if (gap === 0) return <span className="text-[var(--color-ink-muted)]">±0</span>;
  const over = gap > 0;
  return (
    <span style={{ color: over ? 'var(--color-col-today)' : 'var(--color-col-month)' }}>
      {over ? `▲+${gap}` : `▼${Math.abs(gap)}`}
    </span>
  );
}

export function TargetTempPanel({
  icon,
  title,
  outsideTemp,
  rows,
  accent,
  note,
  source,
  adjustment,
}: Props) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold">
        {icon} {title} (<span style={{ color: accent }}>{Math.round(outsideTemp)}°C</span>)
        {adjustment ? (
          <span className="ml-1 font-medium text-[var(--color-ink-muted)]">· {adjustment}</span>
        ) : null}
      </p>

      <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="min-w-[82px] flex-1 rounded-[9px] border-t-2 bg-[#FAFAFA] px-1.5 py-2 text-center"
            style={{ borderTopColor: accent }}
          >
            <p className="text-[9px] leading-tight font-bold" style={{ color: accent }}>
              {row.label}
            </p>
            {row.sub ? <p className="text-[9px] text-[var(--color-ink-muted)]">{row.sub}</p> : null}
            <p className="mt-0.5 text-[13px] font-extrabold">목표 {row.target}°</p>
            <p className="text-[11px] font-bold">
              <Gap target={row.target} outside={outsideTemp} />
            </p>
          </div>
        ))}
      </div>

      <p className="mt-1 text-[9px] leading-relaxed text-[#aaa]">
        ▲ 빨강=목표 초과(과열 주의) · ▼ 파랑=목표 미달(보온 필요) · {note}
        <br />
        출처: {source}
      </p>
    </div>
  );
}
