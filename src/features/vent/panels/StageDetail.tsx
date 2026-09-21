import { particle } from '@/lib/format';
import { HUMIDITY_THRESHOLD, type VentRecommendation } from '@/lib/ventilation';

/**
 * 오늘의 추천 환기 단계.
 *
 * 단계 이름만 크게 띄우지 않고 **왜 그 단계인지**(목표 대비 몇 도, 습도가
 * 끌어올렸는지)를 같이 적는다. 근거 없이 결론만 주면 현장에서 안 쓴다.
 */

export interface VentStage {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  when: string;
  method: string;
  purpose: string;
  checks: string[];
  /** 양돈 단계에만 있는 두당 환기량 기준 */
  rateTable?: { stage: string; cfm: string }[];
  extra?: string;
}

interface Props {
  stage: VentStage;
  /** 온도만 봤을 때의 단계 이름. 습도가 끌어올렸을 때 대조용으로 쓴다. */
  tempStageName: string;
  advice: VentRecommendation;
  todayHigh: number;
  humidity: number | null;
  targetTemp: number;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 rounded-[10px] bg-[#FAFAFA] p-3">
      <p className="mb-1 text-xs font-bold">{title}</p>
      <div className="text-xs leading-relaxed text-[#555]">{children}</div>
    </div>
  );
}

export function StageDetail({
  stage,
  tempStageName,
  advice,
  todayHigh,
  humidity,
  targetTemp,
}: Props) {
  const humid = humidity !== null && humidity > HUMIDITY_THRESHOLD;

  return (
    <section
      className="rounded-[var(--radius-card)] border-t-[5px] bg-white p-5 shadow-[var(--shadow-card)]"
      style={{ borderTopColor: stage.color }}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-[#aaa]">오늘의 추천 환기 단계</p>
          <p className="mt-0.5 text-[19px] font-extrabold" style={{ color: stage.color }}>
            {stage.icon} {stage.name}
          </p>
          <p className="text-[10px] text-[var(--color-ink-muted)]">{stage.nameEn}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#aaa]">오늘 최고기온 · 습도</p>
          <p className="text-[22px] font-extrabold">
            {todayHigh}°C{' '}
            <span
              className="text-sm font-bold"
              style={{ color: humid ? '#0288D1' : 'var(--color-ink-muted)' }}
            >
              💧{humidity !== null ? `${humidity}%` : '-'}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-[#666]">
            목표 {targetTemp}°C ·{' '}
            {advice.diff > 0 ? (
              <>
                목표 대비 <b className="text-[var(--color-col-today)]">+{advice.diff}°C</b> 높음
              </>
            ) : advice.diff < 0 ? (
              <>
                목표 대비 <b className="text-[var(--color-col-month)]">{advice.diff}°C</b> 낮음
              </>
            ) : (
              '목표와 동일'
            )}
          </p>
          {advice.humidityDriven ? (
            <p className="mt-0.5 text-[10px] font-bold text-[#0288D1]">
              💧 습도 기준으로 단계 상향됨
            </p>
          ) : null}
        </div>
      </div>

      {advice.humidityDriven || advice.humidityIneffective ? (
        <div className="mb-2.5 rounded-lg border-l-4 border-[#0288D1] bg-[#E3F2FD] px-3 py-2.5">
          <p className="mb-1 text-xs font-bold text-[#01579B]">
            💧 습도 기준 판정 (Munters 이중제어 로직)
          </p>
          <div className="text-[11px] leading-relaxed">
            {advice.humidityDriven ? (
              <p>
                오늘 습도 {humidity}%는 기준치({HUMIDITY_THRESHOLD}%)를 초과해, 온도만 보면{' '}
                {tempStageName}이지만 습도 요구량이 더 커서 <b>{stage.name}</b>
                {particle(stage.name, '으로')} 상향했습니다.
              </p>
            ) : null}
            {advice.humidityIneffective ? (
              <p className={advice.humidityDriven ? 'mt-1' : undefined}>
                ⚠️ 외기온이 이미 목표온도를 초과한 상태에서 습도까지 높으므로, 환기를 더 늘려도
                습도가 잘 안 떨어질 수 있습니다(바깥 공기 자체가 덥고 습함). 제습·쿨링패드 등 별도
                조치를 함께 검토하세요.
              </p>
            ) : null}
          </div>
          <p className="mt-1.5 text-[9px] text-[#0277BD]">
            출처: Munters Rotem Trio 환기컨트롤러(온도·습도·CO₂ 복합 제어) · PIC "습도{' '}
            {HUMIDITY_THRESHOLD}% 이하 유지" 규정
          </p>
        </div>
      ) : null}

      <Block title="📍 발동 기준">{stage.when}</Block>
      <Block title="🔧 환기 방법">{stage.method}</Block>
      <Block title="🎯 목적">{stage.purpose}</Block>

      {stage.rateTable ? (
        <div className="mb-2.5 rounded-[10px] bg-[#FFF8E8] p-3">
          <p className="mb-1.5 text-xs font-bold">💨 두당 환기량 기준</p>
          <div className="flex flex-wrap gap-2">
            {stage.rateTable.map((row) => (
              <div
                key={row.stage}
                className="min-w-[90px] flex-1 rounded-lg bg-white px-2.5 py-1.5 text-center"
              >
                <p className="text-[10px] text-[var(--color-ink-muted)]">{row.stage}</p>
                <p className="text-[13px] font-bold text-[#E65100]">{row.cfm}</p>
              </div>
            ))}
          </div>
          {stage.extra ? (
            <p className="mt-1.5 text-[10px] text-[var(--color-ink-muted)]">{stage.extra}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[10px] bg-[#EEF4FF] p-3">
        <p className="mb-1 text-xs font-bold">✅ 현장 점검 체크리스트</p>
        <ul className="space-y-0.5">
          {stage.checks.map((check) => (
            <li key={check} className="relative pl-3.5 text-xs leading-relaxed text-[#555]">
              <span aria-hidden className="absolute left-0">
                ·
              </span>
              {check}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
