import { useState } from 'react';
import { Card, CardTitle } from '@/components/Card';
import { particle } from '@/lib/format';
import {
  productionGrade,
  productionIndex,
  requiredGain,
  type ProductionInput,
  type ReverseInput,
} from '@/lib/consult';

/**
 * 육계 생산지수(EPEF) 계산기와 목표 역산.
 *
 * 계산기만 두면 "우리 성적이 424구나"에서 끝난다. 역산을 나란히 두는 이유는
 * 컨설팅의 다음 질문이 늘 **"그럼 목표를 맞추려면 하루 몇 g을 키워야 하나"**
 * 이기 때문이다. 같은 공식을 뒤집은 것뿐이라 두 값이 어긋날 수 없다.
 */

const DEFAULT_INPUT: ProductionInput = {
  placed: 30000,
  shipped: 29400,
  days: 33,
  feedKg: 62000,
  totalWeightKg: 51000,
};

const DEFAULT_REVERSE: ReverseInput = { target: 400, survival: 97, days: 33, fcr: 1.55 };

function NumberField({
  label,
  unit,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="min-w-[130px] flex-1">
      <label className="mb-1 block text-[10px] text-[var(--color-ink-muted)]">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="min-w-0 flex-1 rounded-lg border border-black/15 px-2 py-1 text-right text-sm"
        />
        <span className="text-[10px] text-[var(--color-ink-muted)]">{unit}</span>
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[90px] flex-1 rounded-lg bg-[#FAFAFA] px-2 py-1.5 text-center">
      <p className="text-[10px] text-[var(--color-ink-muted)]">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] text-[var(--color-ink-muted)]">{label}</label>
        <span className="text-xs font-bold">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-[var(--color-header-to)]"
      />
    </div>
  );
}

export function ProductionIndexPanel() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [reverse, setReverse] = useState(DEFAULT_REVERSE);

  const result = productionIndex(input);
  const grade = result ? productionGrade(result.epef) : null;
  const target = requiredGain(reverse);
  const targetGrade = productionGrade(reverse.target);

  const patch = (key: keyof ProductionInput) => (value: number) =>
    setInput((previous) => ({ ...previous, [key]: value }));
  const patchReverse = (key: keyof ReverseInput) => (value: number) =>
    setReverse((previous) => ({ ...previous, [key]: value }));

  return (
    <>
      <Card>
        <CardTitle icon="🧮" note="입식·출하 성적을 입력하면 생산지수를 자동 계산합니다">
          육계 생산지수 계산기 (EPEF)
        </CardTitle>

        <div className="flex flex-wrap gap-2">
          <NumberField
            label="입식마릿수"
            unit="마리"
            value={input.placed}
            step={100}
            onChange={patch('placed')}
          />
          <NumberField
            label="출하수수"
            unit="마리"
            value={input.shipped}
            step={100}
            onChange={patch('shipped')}
          />
          <NumberField label="사육일수" unit="일" value={input.days} onChange={patch('days')} />
          <NumberField
            label="총사료섭취량"
            unit="kg"
            value={input.feedKg}
            step={100}
            onChange={patch('feedKg')}
          />
          <NumberField
            label="총중량(출하시)"
            unit="kg"
            value={input.totalWeightKg}
            step={100}
            onChange={patch('totalWeightKg')}
          />
        </div>

        {result && grade ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <Readout label="생존율" value={`${result.survival.toFixed(1)}%`} />
              <Readout label="평균출하체중" value={`${result.avgWeightKg.toFixed(2)}kg`} />
              <Readout label="일당증체량" value={`${result.adg.toFixed(1)}g`} />
              <Readout label="사료요구율" value={result.fcr.toFixed(3)} />
            </div>

            <div
              className="mt-2 rounded-xl px-3 py-2.5 text-center"
              style={{ background: grade.bg }}
            >
              <p className="text-[10px] font-bold" style={{ color: grade.color }}>
                생산지수 (EPEF)
              </p>
              <p className="text-2xl font-extrabold" style={{ color: grade.color }}>
                {Math.round(result.epef)} <span className="text-sm">{grade.label}</span>
              </p>
              <p className="text-[11px]" style={{ color: grade.color }}>
                {grade.note}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-[var(--color-col-today)]">
            입식마릿수·출하수수·사육일수·총중량은 0보다 커야 계산됩니다.
          </p>
        )}

        <p className="mt-2 text-[10px] text-[var(--color-ink-muted)]">
          공식: 생산지수 = 생존율(%) × 일당증체량(g) ÷ (사료요구율 × 10)
        </p>
      </Card>

      <Card>
        <CardTitle icon="🎯" note="목표 지수를 내려면 하루 얼마나 키워야 하는지 확인하세요">
          목표 생산지수 역산
        </CardTitle>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-4 gap-y-2">
          <Slider
            label="목표 생산지수"
            value={reverse.target}
            min={200}
            max={500}
            step={5}
            suffix=""
            onChange={patchReverse('target')}
          />
          <Slider
            label="생존율"
            value={reverse.survival}
            min={80}
            max={100}
            step={0.5}
            suffix="%"
            onChange={patchReverse('survival')}
          />
          <Slider
            label="사육일수"
            value={reverse.days}
            min={25}
            max={50}
            step={1}
            suffix="일"
            onChange={patchReverse('days')}
          />
          <Slider
            label="사료요구율(FCR)"
            value={reverse.fcr}
            min={1.2}
            max={2}
            step={0.01}
            suffix=""
            onChange={patchReverse('fcr')}
          />
        </div>

        {target ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Readout label="필요 일당증체량(ADG)" value={`${target.adg.toFixed(1)} g/일`} />
            <Readout
              label={`→ ${reverse.days}일령 필요 출하체중`}
              value={`${target.weightKg.toFixed(2)} kg`}
            />
          </div>
        ) : null}

        <p className="mt-2 text-[11px]" style={{ color: targetGrade.color }}>
          목표 {reverse.target}
          {particle(String(reverse.target), '은')} "{targetGrade.label}" 등급입니다 —{' '}
          {targetGrade.note}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
          공식을 뒤집은 값: 일당증체량 = 목표지수 × FCR × 10 ÷ 생존율. 생존율·사육일수·FCR을
          고정했을 때 이 일당증체량을 달성해야 목표 생산지수에 도달합니다.
        </p>
      </Card>
    </>
  );
}
