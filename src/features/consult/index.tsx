import { useMemo, useState } from 'react';
import { Card, CardTitle } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { CONSULT_BREEDS } from '@/data/breeds';
import { BROILER_MGMT_POINTS, LAYER_MGMT_POINTS } from '@/data/mgmt-points';
import { broilerAt, layerAt, waterFromFeed, type LayerTable } from '@/lib/consult';
import { formatNumber } from '@/lib/format';
import { IntakeTable } from './panels/IntakeTable';
import { ProductionIndexPanel } from './panels/ProductionIndexPanel';
import { WaterReference } from './panels/WaterReference';

/**
 * 육계/산란계 컨설팅 탭.
 *
 * 품종·일령을 고르면 세계 표준 사양매뉴얼 수치를 바로 보여 준다.
 * 표 조회와 계산은 `src/lib/consult.ts` 에 있고 여기는 고르고 배치하는 일만 한다.
 *
 * 매뉴얼 수치는 "목표치"이지 실적이 아니다. 축약 표에 없는 나이는 보간값이므로
 * 그 사실을 화면에 밝힌다 — 근거 없는 정밀함이 가장 위험하다.
 */

type SpeciesKey = 'broiler' | 'layer';

const ACCENT = { broiler: '#E8530A', layer: '#D4A012' } as const;

/** 표에 실린 나이 목록. 육계는 촘촘하고 산란계는 뒤로 갈수록 5주 간격이다. */
function ageList(species: SpeciesKey, data: unknown): number[] {
  if (species === 'broiler') return (data as number[][]).map((row) => row[0]!);
  const table = data as LayerTable;
  return [...table.rearing, ...table.production].map((row) => row[0]!);
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'rounded-lg border-2 px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap transition-colors',
        selected
          ? 'border-[var(--color-header-from)] bg-[var(--color-header-from)] text-[var(--color-tab-accent)]'
          : 'border-black/[0.08] bg-white text-[#333] hover:bg-black/[0.03]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function ConsultTab() {
  const [species, setSpecies] = useState<SpeciesKey>('broiler');
  const [breedId, setBreedId] = useState<string>('ross308');
  const [age, setAge] = useState(7);

  const group = CONSULT_BREEDS[species];
  const breeds = group.breeds as Record<string, { name: string; data: unknown; source: string }>;
  const breed = breeds[breedId] ?? Object.values(breeds)[0]!;
  const accent = ACCENT[species];

  const ages = useMemo(() => ageList(species, breed.data), [species, breed.data]);
  const maxAge = group.maxAge;

  const point =
    species === 'broiler'
      ? broilerAt(breed.data as number[][], age)
      : layerAt(breed.data as unknown as LayerTable, age);

  function switchSpecies(next: SpeciesKey) {
    setSpecies(next);
    const first = Object.keys(CONSULT_BREEDS[next].breeds)[0]!;
    setBreedId(first);
    // 일령(40)과 주령(100)은 눈금이 달라 그대로 두면 엉뚱한 자리를 가리킨다.
    setAge(next === 'broiler' ? 7 : 25);
  }

  const water =
    species === 'broiler' && point
      ? waterFromFeed('broiler', (point.value as { dailyFeed: number | null }).dailyFeed)
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon="🐔🥚" note="선택하면 세계 표준 사양매뉴얼 수치를 바로 보여줍니다">
          육계/산란계 컨설팅
        </CardTitle>

        <div className="flex gap-2">
          {(['broiler', 'layer'] as SpeciesKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => switchSpecies(key)}
              aria-pressed={species === key}
              className={[
                'flex-1 rounded-lg border-2 px-1.5 py-2.5 text-[13px] font-bold transition-colors',
                species === key
                  ? 'border-[var(--color-header-from)] bg-[var(--color-header-from)] text-[var(--color-tab-accent)]'
                  : 'border-black/[0.08] bg-white text-[#333] hover:bg-black/[0.03]',
              ].join(' ')}
            >
              {CONSULT_BREEDS[key].icon} {CONSULT_BREEDS[key].label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(breeds).map(([id, item]) => (
            <Chip key={id} selected={id === breedId} onClick={() => setBreedId(id)}>
              {item.name}
            </Chip>
          ))}
        </div>

        <div className="mt-3">
          <label htmlFor="consult-age" className="text-[11px] font-bold">
            {group.unit} 입력
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              id="consult-age"
              type="range"
              min={species === 'broiler' ? 0 : 1}
              max={maxAge}
              value={age}
              onChange={(event) => setAge(Number(event.target.value))}
              className="min-w-0 flex-1 accent-[var(--color-header-to)]"
            />
            <input
              type="number"
              inputMode="numeric"
              min={species === 'broiler' ? 0 : 1}
              max={maxAge}
              value={age}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) setAge(Math.max(0, Math.min(maxAge, next)));
              }}
              className="w-20 rounded-lg border border-black/15 px-2 py-1 text-right text-sm"
            />
            <span className="text-[11px] text-[var(--color-ink-muted)]">{group.unit}</span>
          </div>
        </div>

        {point ? (
          <>
            <p className="mt-3 text-[11px] font-bold" style={{ color: accent }}>
              {breed.name} · {age}
              {group.unit}
              {species === 'layer'
                ? ` (${(point.value as { phase: string }).phase === 'rearing' ? '육성기' : '산란기'})`
                : ''}
              {point.interpolated ? (
                <span className="ml-1.5 font-medium text-[var(--color-ink-muted)]">
                  표에 없는 {group.unit}이라 앞뒤를 선형보간한 값입니다
                </span>
              ) : null}
            </p>

            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              {species === 'broiler' ? (
                <BroilerCards point={point.value as BroilerValue} accent={accent} water={water} />
              ) : (
                <LayerCards point={point.value as LayerValue} accent={accent} />
              )}
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            이 {group.unit}의 값이 매뉴얼 표에 없습니다.
          </p>
        )}
      </Card>

      <Card>
        <IntakeTable
          species={species}
          breedName={breed.name}
          table={breed.data as number[][] | LayerTable}
          ages={ages}
          selected={age}
          unit={group.unit}
        />
        <div className="mt-3">
          <WaterReference showDrinkerFlow={species === 'broiler'} />
        </div>
        <p className="mt-3 text-[10px] text-[var(--color-ink-muted)]">
          ※ 음수량 기준 출처:{' '}
          {species === 'broiler'
            ? 'Aviagen Brief 「Water Utilization in Broilers」 2025.1. 육계 일일 사료섭취량은 매뉴얼의 누적 사료섭취량을 전날과 차감해 역산한 값입니다.'
            : 'Lohmann LSL-Lite Management Guide 「Water Supply」 · Hy-Line Management Guide.'}
        </p>
      </Card>

      {species === 'broiler' ? <ProductionIndexPanel /> : null}

      <Card>
        <CardTitle icon="📋">사양관리 컨설팅 포인트</CardTitle>
        <ul className="space-y-1.5">
          {(species === 'broiler' ? BROILER_MGMT_POINTS : LAYER_MGMT_POINTS).map((item) => (
            <li key={item} className="relative pl-4 text-xs leading-relaxed">
              <span aria-hidden className="absolute left-0" style={{ color: accent }}>
                ·
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-[var(--color-ink-muted)]">
          ※ 출처:{' '}
          {species === 'broiler'
            ? 'Aviagen Broiler Performance Objectives — Key Management Points'
            : 'Hy-Line International Commercial Layers Management Guide — Growth & Development'}
        </p>
      </Card>

      <p className="text-[10px] leading-relaxed text-[#aaa]">
        ※ 출처: {breed.source}. 사양매뉴얼 표는 국가·환경에 따라 실제 성적과 차이가 날 수 있는
        "목표치"이며, 축약 표에 없는 {group.unit}은 인접한 두 시점 사이를 선형보간한 값입니다. 실제
        현장 컨설팅 시에는 반드시 해당 육종회사의 최신 원문 매뉴얼을 함께 확인하세요.
      </p>
    </div>
  );
}

interface BroilerValue {
  weight: number | null;
  gain: number | null;
  cumulativeFeed: number | null;
  fcr: number | null;
  dailyFeed: number | null;
}

function BroilerCards({
  point,
  accent,
  water,
}: {
  point: BroilerValue;
  accent: string;
  water: { low: number; high: number } | null;
}) {
  return (
    <>
      <StatCard
        icon="⚖️"
        label="목표체중"
        value={formatNumber(point.weight)}
        unit="g"
        accent={accent}
      />
      <StatCard icon="📉" label="누적 FCR" value={point.fcr?.toFixed(3) ?? '—'} accent={accent} />
      <StatCard
        icon="📈"
        label="일당증체"
        value={formatNumber(point.gain)}
        unit="g"
        accent={accent}
      />
      <StatCard
        icon="🌾"
        label="누적 사료섭취"
        value={formatNumber(point.cumulativeFeed)}
        unit="g"
        accent={accent}
      />
      <StatCard
        icon="🍚"
        label="일일 사료섭취"
        value={formatNumber(point.dailyFeed)}
        unit="g"
        accent={accent}
      />
      <StatCard
        icon="💧"
        label="일일 음수량"
        value={water ? `${Math.round(water.low)}~${Math.round(water.high)}` : '—'}
        unit="ml"
        note="사료섭취량에서 환산"
        accent={accent}
      />
    </>
  );
}

interface LayerValue {
  phase: string;
  weight: number | null;
  feed: number | null;
  water: number | null;
  mortality: number | null;
  layRate: number | null;
  eggWeight: number | null;
}

function LayerCards({ point, accent }: { point: LayerValue; accent: string }) {
  return (
    <>
      {point.layRate !== null ? (
        <StatCard
          icon="🥚"
          label="산란율(Hen-Day)"
          value={point.layRate.toFixed(1)}
          unit="%"
          accent={accent}
        />
      ) : null}
      <StatCard
        icon="⚖️"
        label="목표체중"
        value={formatNumber(point.weight)}
        unit="g"
        accent={accent}
      />
      {point.eggWeight !== null ? (
        <StatCard
          icon="🪺"
          label="평균 난중"
          value={point.eggWeight.toFixed(1)}
          unit="g"
          accent={accent}
        />
      ) : null}
      <StatCard
        icon="🍚"
        label="일일 사료섭취"
        value={formatNumber(point.feed)}
        unit="g"
        accent={accent}
      />
      <StatCard
        icon="💧"
        label="일일 음수량"
        value={formatNumber(point.water)}
        unit="ml"
        note="매뉴얼 수록값"
        accent={accent}
      />
      <StatCard
        icon="📉"
        label="누적 폐사율"
        value={point.mortality?.toFixed(2) ?? '—'}
        unit="%"
        accent={accent}
      />
    </>
  );
}
