import { useState } from 'react';
import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton } from '@/components/PanelStatus';
import { BROILER_TARGET_TEMP, LAYER_TARGET_TEMP, PIG_TARGET_TEMP } from '@/data/target-temp';
import { POULTRY_VENT_STAGES, SWINE_VENT_STAGES } from '@/data/vent-stages';
import { useTodayClimate } from '@/lib/climate';
import { HUMIDITY_THRESHOLD, recommend } from '@/lib/ventilation';
import { StageDetail } from './panels/StageDetail';
import { WeekOutlook } from './panels/WeekOutlook';

/**
 * 환기가이드 탭.
 *
 * "오늘 날씨 × 계사구조 × 사육단계 → 어느 환기 단계로 갈 것인가"를 짚어 준다.
 * 판정 자체는 `src/lib/ventilation.ts` 에 있고, 여기는 고르고 보여 주는 일만 한다.
 *
 * 날씨는 날씨 탭이 고른 위치를 그대로 쓴다. 두 탭이 다른 지역을 보면
 * 권고가 어긋나기 때문이다.
 */

type SpeciesKey = 'broiler' | 'layer' | 'pig';
type BarnKey = 'solid' | 'curtain';

const SPECIES = {
  broiler: {
    label: '육계',
    icon: '🐔',
    table: BROILER_TARGET_TEMP.map((row) => ({ label: row.day, target: row.t, sub: undefined })),
    stages: POULTRY_VENT_STAGES,
  },
  layer: {
    label: '산란계',
    icon: '🥚',
    table: LAYER_TARGET_TEMP.map((row) => ({ label: row.wk, target: row.t, sub: undefined })),
    stages: POULTRY_VENT_STAGES,
  },
  pig: {
    label: '양돈',
    icon: '🐷',
    table: PIG_TARGET_TEMP.map((row) => ({
      label: row.stage,
      target: row.t,
      sub: row.weight as string | undefined,
    })),
    stages: SWINE_VENT_STAGES,
  },
} as const satisfies Record<SpeciesKey, unknown>;

const BARNS: { key: BarnKey; label: string }[] = [
  { key: 'solid', label: '🏭 무창(밀폐형)' },
  { key: 'curtain', label: '🏚️ 유창(커튼형·자연환기)' },
];

/** 계사구조가 판정에 주는 단서. 구조가 다르면 같은 숫자를 다르게 읽어야 한다. */
function barnNote(species: SpeciesKey, barn: BarnKey): string | null {
  if (barn !== 'curtain') return null;
  return species === 'pig'
    ? '유창(커튼형) 돈사는 단열이 약해 목표온도를 1~2°C 높여 판단하는 것이 PIC 권장사항입니다.'
    : '자연환기(유창) 계사는 바람·일사 영향이 커 아래 3단계 체계를 참고용으로만 활용하세요.';
}

function Choice({
  selected,
  onClick,
  children,
  small = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'rounded-lg border-2 font-bold transition-colors',
        small ? 'px-2.5 py-1.5 text-[11px] whitespace-nowrap' : 'flex-1 px-1.5 py-2.5 text-[13px]',
        selected
          ? 'border-[var(--color-header-from)] bg-[var(--color-header-from)] text-[var(--color-tab-accent)]'
          : 'border-black/[0.08] bg-white text-[#333] hover:bg-black/[0.03]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function VentTab() {
  const [species, setSpecies] = useState<SpeciesKey>('broiler');
  const [barn, setBarn] = useState<BarnKey>('solid');
  const [stageIndex, setStageIndex] = useState(0);

  const { location, climate, forecast, isPending, error } = useTodayClimate();

  const info = SPECIES[species];
  // 축종을 바꾸면 표 길이가 달라져 고른 자리가 범위를 넘을 수 있다.
  const safeIndex = Math.min(stageIndex, info.table.length - 1);
  const stage = info.table[safeIndex]!;
  const note = barnNote(species, barn);

  const todayHigh = climate?.tMax ?? null;
  const humidity = climate?.meanHumidity ?? null;
  const advice =
    todayHigh !== null
      ? recommend(todayHigh, stage.target, humidity === null ? null : Math.round(humidity))
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon="🌬️">환기가이드</CardTitle>
        <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
          Aviagen(가금) · PIC(양돈) 3단계 체계 + Munters 습도 이중제어 로직 — 오늘 날씨·계사구조·
          사육단계에 맞는 환기방법을 짚어 줍니다.
        </p>

        <div className="mt-3 flex gap-2">
          {(Object.keys(SPECIES) as SpeciesKey[]).map((key) => (
            <Choice
              key={key}
              selected={species === key}
              onClick={() => {
                setSpecies(key);
                setStageIndex(0);
              }}
            >
              {SPECIES[key].icon} {SPECIES[key].label}
            </Choice>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          {BARNS.map((item) => (
            <Choice key={item.key} selected={barn === item.key} onClick={() => setBarn(item.key)}>
              {item.label}
            </Choice>
          ))}
        </div>

        <p className="mt-3 mb-1.5 text-[11px] font-bold">사육단계 선택 ({info.label})</p>
        <div className="flex flex-wrap gap-1.5">
          {info.table.map((row, index) => (
            <Choice
              key={row.label}
              small
              selected={index === safeIndex}
              onClick={() => setStageIndex(index)}
            >
              {row.label}
              {row.sub ? ` · ${row.sub}` : ''}
            </Choice>
          ))}
        </div>

        {note ? (
          <p className="mt-3 rounded-lg bg-[var(--color-col-yesterday-bg)] px-3 py-2 text-[11px] text-[var(--color-ink-muted)]">
            {note}
          </p>
        ) : null}
      </Card>

      {!location ? (
        <Card>
          <p className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
            🌤️ 날씨 탭에서 농장 지역을 먼저 설정하면 오늘 기상 기준으로 환기 단계를 짚어 드립니다.
          </p>
        </Card>
      ) : isPending ? (
        <Card>
          <PanelSkeleton rows={5} />
        </Card>
      ) : error ? (
        <Card>
          <PanelError message={error.message} />
        </Card>
      ) : advice && climate ? (
        <>
          <StageDetail
            stage={info.stages[advice.stage]!}
            tempStageName={info.stages[advice.byTemp]!.name}
            advice={advice}
            todayHigh={Math.round(climate.tMax ?? 0)}
            humidity={humidity === null ? null : Math.round(humidity)}
            targetTemp={stage.target}
          />
          {forecast ? (
            <WeekOutlook forecast={forecast} stages={info.stages} targetTemp={stage.target} />
          ) : null}
        </>
      ) : null}

      <p className="text-[10px] leading-relaxed text-[#aaa]">
        ※ 온도 기준 3단계 체계는 Aviagen 「Environmental Management in the Broiler House」, PIC
        「Wean to Finish Guidelines Appendix A」, 미네소타대 확장연구소(L. Jacobson) 자료를
        재구성했습니다. 습도 기준 판정은 Munters 의 상업용 컨트롤러(Rotem Trio)가 쓰는 "온도요구·
        습도요구 환기량 중 더 큰 값을 따르는" 이중제어 로직과 PIC 의 습도 {HUMIDITY_THRESHOLD}% 관리
        기준을 결합해 구성했습니다. 실제 전환 시점은 수치뿐 아니라 계군·돈군의 행동(헐떡임, 웅크림,
        피딩 활동 등)을 함께 관찰해 판단하는 것이 원 지침의 핵심입니다.
      </p>
    </div>
  );
}
