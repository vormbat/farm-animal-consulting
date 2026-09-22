import { DRINKER_FLOW_BROILER, WF_RATIO_BY_TEMP } from '@/data/heat-stress';
import { waterTempFactor } from '@/lib/livestock-weather';

/**
 * 음수량 참고표 세 가지.
 *
 * 앞의 표는 21°C 표준조건 값이다. 현장은 그 조건이 아니므로 **무엇을 곱해
 * 읽어야 하는지**를 바로 아래 둔다. 보정 없이 표만 주면 여름에 늘 "음수량이
 * 기준보다 많다"는 오판을 부른다.
 */

const TEMPERATURES = [20, 25, 30, 35];

function Tile({ head, value, accent }: { head: string; value: string; accent: string }) {
  return (
    <div className="min-w-[72px] flex-1 rounded-lg bg-white px-2 py-1.5 text-center">
      <p className="text-[10px] text-[var(--color-ink-muted)]">{head}</p>
      <p className="text-[13px] font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

export function WaterReference({ showDrinkerFlow }: { showDrinkerFlow: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[10px] bg-[#FFF8E8] p-3">
        <p className="mb-1.5 text-[11px] font-bold">🌡️ 계사온도별 음수량 보정계수 (20°C 기준)</p>
        <div className="flex flex-wrap gap-2">
          {TEMPERATURES.map((temp) => (
            <Tile
              key={temp}
              head={`${temp}°C`}
              value={`×${waterTempFactor(temp).toFixed(2)}`}
              accent="var(--color-ink-orange)"
            />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
          Cobb 매뉴얼 규칙: 20~32°C는 1°C당 음수량 +6%, 32~38°C는 1°C당 +5%. 같은 문단에서
          사료섭취량은 20°C 초과 1°C당 −1.23%로 줄어든다고 명시합니다 — 더위에 사료는 덜 먹고 물은
          더 먹으므로 위 표의 g·ml을 같이 보정해야 합니다.
        </p>
      </div>

      <div className="rounded-[10px] bg-[#EEF4FF] p-3">
        <p className="mb-1.5 text-[11px] font-bold">📊 온도별 물:사료 비율 기준</p>
        <div className="flex flex-wrap gap-2">
          {WF_RATIO_BY_TEMP.map(([temp, ratio]) => (
            <Tile key={temp} head={`${temp}°C`} value={`${ratio!.toFixed(1)}:1`} accent="#1565C0" />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--color-ink-muted)]">
          출처: Cobb Broiler Management Guide 수록표(원전 Singleton 2004).
        </p>
      </div>

      {showDrinkerFlow ? (
        <div className="rounded-[10px] bg-[#F1F8E9] p-3">
          <p className="mb-1.5 text-[11px] font-bold">🚿 일령별 니플급수기 권장 유량</p>
          <div className="flex flex-wrap gap-2">
            {DRINKER_FLOW_BROILER.map(([range, flow]) => (
              <Tile key={range} head={range!} value={flow!} accent="#2E7D32" />
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
            유량을 일령에 맞춰 올려주지 않으면 닭이 표준 음수량을 마시고 싶어도 못 마시고, 음수
            부족은 곧 사료섭취 저하로 이어집니다. 출처: Aviagen Brief Table 2.
          </p>
        </div>
      ) : null}
    </div>
  );
}
