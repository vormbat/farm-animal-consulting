import { formatNumber } from '@/lib/format';
import { broilerAt, layerAt, waterFromFeed, type LayerTable, type SpeciesKey } from '@/lib/consult';

/**
 * 일령·주령별 음수량 · 사료섭취량.
 *
 * 이 표가 이 탭의 본체다. 컨설턴트가 농가에서 실제로 대조하는 것이
 * "오늘 급수미터 숫자가 이 범위 안인가"이기 때문이다.
 *
 * **갑작스러운 음수량 변화는 질병·급수설비 이상의 가장 빠른 신호**라,
 * 체중이나 FCR 보다 이 열을 먼저 본다.
 */

interface Props {
  species: SpeciesKey;
  breedName: string;
  /** 육계=일령 배열, 산란계=주령 표 */
  table: number[][] | LayerTable;
  ages: number[];
  selected: number;
  unit: string;
}

function BroilerRows({
  rows,
  ages,
  selected,
}: {
  rows: number[][];
  ages: number[];
  selected: number;
}) {
  return (
    <>
      {ages.map((age) => {
        const point = broilerAt(rows, age)?.value;
        // 입추 당일(0일령)은 누적 사료가 비어 있어 줄 전체가 대시가 된다. 뺀다.
        if (!point || point.dailyFeed === null) return null;
        const water = waterFromFeed('broiler', point.dailyFeed);
        const isCurrent = age === selected;
        return (
          <tr
            key={age}
            className="border-t border-[var(--color-table-rule)]"
            style={isCurrent ? { background: 'var(--color-brand-egg-bg)' } : undefined}
          >
            <th scope="row" className="px-2 py-1 text-[11px] font-bold">
              {age}
            </th>
            <td className="px-2 py-1 text-right text-[11px]">{formatNumber(point.dailyFeed)}</td>
            <td className="px-2 py-1 text-right text-[11px]">
              {water ? `${Math.round(water.low)}~${Math.round(water.high)}*` : '—'}
            </td>
            <td className="px-2 py-1 text-right text-[11px]">
              {formatNumber(point.cumulativeFeed)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function LayerRows({
  table,
  ages,
  selected,
}: {
  table: LayerTable;
  ages: number[];
  selected: number;
}) {
  return (
    <>
      {ages.map((age) => {
        const point = layerAt(table, age)?.value;
        if (!point || (point.feed === null && point.water === null)) return null;
        const isCurrent = age === selected;
        const ratio = point.feed && point.water ? (point.water / point.feed).toFixed(2) : '—';
        return (
          <tr
            key={age}
            className="border-t border-[var(--color-table-rule)]"
            style={isCurrent ? { background: 'var(--color-brand-egg-bg)' } : undefined}
          >
            <th scope="row" className="px-2 py-1 text-[11px] font-bold">
              {age}
            </th>
            <td className="px-2 py-1 text-right text-[11px]">{formatNumber(point.feed)}</td>
            <td className="px-2 py-1 text-right text-[11px]">{formatNumber(point.water)}</td>
            <td className="px-2 py-1 text-right text-[11px]">{ratio}</td>
          </tr>
        );
      })}
    </>
  );
}

export function IntakeTable({ species, breedName, table, ages, selected, unit }: Props) {
  const isBroiler = species === 'broiler';

  return (
    <div>
      <p className="text-[11px] font-bold">
        💧 {unit}별 음수량 · 사료섭취량
        <span className="ml-1.5 font-medium text-[var(--color-ink-muted)]">
          {breedName} 사육표준 매뉴얼 기준 · 현재 선택 {selected}
          {unit} 강조
        </span>
      </p>

      <div className="mt-1.5 max-h-[420px] overflow-auto rounded-lg border border-black/[0.08]">
        <table className="w-full border-collapse">
          <caption className="sr-only">
            {breedName} {unit}별 사료섭취량과 음수량
          </caption>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-table-head)]">
              <th scope="col" className="px-2 py-1.5 text-[11px] font-bold text-white">
                {unit}
              </th>
              <th scope="col" className="px-2 py-1.5 text-right text-[11px] font-bold text-white">
                사료(g/일)
              </th>
              <th scope="col" className="px-2 py-1.5 text-right text-[11px] font-bold text-white">
                음수(ml/일)
              </th>
              <th scope="col" className="px-2 py-1.5 text-right text-[11px] font-bold text-white">
                {isBroiler ? '누적사료(g)' : '물:사료'}
              </th>
            </tr>
          </thead>
          <tbody>
            {isBroiler ? (
              <BroilerRows rows={table as number[][]} ages={ages} selected={selected} />
            ) : (
              <LayerRows table={table as LayerTable} ages={ages} selected={selected} />
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
        {isBroiler ? (
          <>
            * 표시된 음수량은 매뉴얼의 물:사료 비율 1.6~1.8 : 1(21°C 기준)로 일일 사료섭취량에서
            환산한 값입니다 — 매뉴얼이 일령별 음수량 표를 직접 싣지 않기 때문입니다.{' '}
          </>
        ) : (
          <>음수량은 매뉴얼에 실린 주령별 기준값입니다. </>
        )}
        실제 음수량은 급수미터로 매일 기록해 이 범위와 대조하세요. 갑작스러운 음수량 변화는
        질병·급수설비 이상의 가장 빠른 신호입니다.
      </p>
    </div>
  );
}
