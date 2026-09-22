import { formatNumber } from '@/lib/format';
import type { Country } from '@/types/data/hpai';
import { LEVELS, POULTRY_COLOR, WILD_COLOR, regionName } from '../labels';

/**
 * 국가별 신고 표.
 *
 * 가금과 야생조류를 숫자로만 늘어놓으면 비율이 안 읽힌다. 한 줄 막대로 같이
 * 보여 주는 이유는, 야생조류 쪽이 크면 **아직 가금으로 넘어오지 않은 단계**라는
 * 뜻이고 그때가 방역을 조일 시점이기 때문이다.
 */

export function SpeciesBar({
  poultry,
  wild,
  className,
}: {
  poultry: number;
  wild: number;
  className?: string;
}) {
  const total = poultry + wild;
  if (total === 0) return null;
  return (
    <div
      className={`flex h-1.5 overflow-hidden rounded ${className ?? ''}`}
      role="img"
      aria-label={`가금 ${poultry}건, 야생조류 ${wild}건`}
    >
      <div style={{ width: `${(poultry / total) * 100}%`, background: POULTRY_COLOR }} />
      <div style={{ width: `${(wild / total) * 100}%`, background: WILD_COLOR }} />
    </div>
  );
}

interface Props {
  rows: Country[];
  /** 순위 번호를 붙인다 */
  ranked?: boolean;
  /** 지역 열을 함께 보여 준다 */
  showRegion?: boolean;
}

export function CountryTable({ rows, ranked = false, showRegion = false }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-ink-muted)]">해당하는 국가가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse whitespace-nowrap">
        <caption className="sr-only">국가별 조류인플루엔자 신고 현황</caption>
        <thead>
          <tr className="bg-[var(--color-table-head)]">
            {ranked ? (
              <th scope="col" className="px-2 py-1.5 text-[11px] font-bold text-white">
                #
              </th>
            ) : null}
            <th scope="col" className="px-2 py-1.5 text-left text-[11px] font-bold text-white">
              국가
            </th>
            {showRegion ? (
              <th scope="col" className="px-2 py-1.5 text-[11px] font-bold text-white">
                지역
              </th>
            ) : null}
            <th scope="col" className="px-2 py-1.5 text-right text-[11px] font-bold text-white">
              신고
            </th>
            <th scope="col" className="min-w-[90px] px-2 py-1.5 text-[11px] font-bold text-white">
              가금/야생
            </th>
            <th scope="col" className="px-2 py-1.5 text-[11px] font-bold text-white">
              최근
            </th>
            <th scope="col" className="px-2 py-1.5 text-[11px] font-bold text-white">
              상태
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const level = LEVELS[row.level];
            return (
              <tr key={row.iso || row.name} className="border-t border-[var(--color-table-rule)]">
                {ranked ? (
                  <td className="px-2 py-1.5 text-center text-[11px] text-[var(--color-ink-muted)]">
                    {index + 1}
                  </td>
                ) : null}
                <th scope="row" className="px-2 py-1.5 text-left text-[11px] font-bold text-[#333]">
                  {row.name}
                  {row.iso === 'KOR' ? (
                    ' 🇰🇷'
                  ) : row.eaaf ? (
                    <span className="ml-1 text-[9px] font-semibold text-[var(--color-ink-wild)]">
                      ●철새경로
                    </span>
                  ) : null}
                </th>
                {showRegion ? (
                  <td className="px-2 py-1.5 text-center text-[11px] text-[var(--color-ink-muted)]">
                    {regionName(row.region)}
                  </td>
                ) : null}
                <td className="px-2 py-1.5 text-right text-[12px] font-semibold">
                  {formatNumber(row.total)}
                </td>
                <td className="px-2 py-1.5">
                  <SpeciesBar poultry={row.poultry} wild={row.wild} />
                  <p className="mt-0.5 text-center text-[9px] text-[var(--color-ink-muted)]">
                    {row.poultry} / {row.wild}
                  </p>
                </td>
                <td className="px-2 py-1.5 text-center text-[10px] text-[var(--color-ink-muted)]">
                  {row.latest ?? '—'}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: level.bg, color: level.color }}
                  >
                    {level.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
