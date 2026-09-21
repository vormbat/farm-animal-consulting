import type { ReactNode } from 'react';
import { HSI_ACTIONS } from '@/data/heat-stress';
import type { TodayClimate } from '@/lib/climate';
import { apparentTargets, hsiInRange, hsiLevel } from '@/lib/livestock-weather';

/**
 * 오늘의 축산 관리 포인트.
 *
 * 이 카드가 이 탭의 결론이다. 위쪽 카드들이 "오늘 날씨가 어떤가"를 보여 준다면
 * 여기서는 **그래서 지금 무엇을 하라**고 말한다. 조치 목록은 Hy-Line 매뉴얼이
 * 단계별로 규정한 내용을 옮긴 것이고, 목표 계사온도는 Aviagen 체감온도 표다.
 *
 * 20°C 미만은 Hy-Line 표의 판정 범위 밖이다. 지수를 억지로 들이대지 않고
 * 그 사실을 카드에 적는다 — 없는 판정을 지어내면 다른 숫자까지 못 믿게 된다.
 */

interface Props {
  climate: TodayClimate;
  locationName: string;
}

const COLD_LEVEL = {
  key: 'cold' as const,
  label: '저온',
  short: 'Below range',
  icon: '❄️',
  color: '#1565C0',
  bg: '#E3F2FD',
};

/**
 * 산란계 고온기 물:사료 비율. Hy-Line 은 21°C 에서 2:1, 38°C 에서 8:1 로 제시한다.
 * 두 지점 사이를 선형보간하고 그 밖은 양 끝으로 고정한다.
 */
function waterFeedRatio(tempC: number | null): number | null {
  if (tempC === null) return null;
  if (tempC <= 21) return 2;
  if (tempC >= 38) return 8;
  return 2 + (8 - 2) * ((tempC - 21) / (38 - 21));
}

function Bullet({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="relative mb-0.5 pl-4 text-[11.5px] leading-[1.75]">
      <span aria-hidden className="absolute left-0 font-bold" style={{ color }}>
        ·
      </span>
      {children}
    </div>
  );
}

/** 열 말고도 오늘 같이 볼 것들. 근거가 있는 항목만 조건부로 띄운다. */
function riskFactors(climate: TodayClimate, hot: boolean): ReactNode[] {
  const items: ReactNode[] = [];

  if (hot) {
    items.push(
      <Bullet key="shell" color="#D4A012">
        🥚 <b>산란계 난각질</b> — 헐떡임(과호흡)으로 혈중 CO₂가 빠지면 혈액이 알칼리로 기울어
        (호흡성 알칼리증) 난각선으로 가는 칼슘이 줄고 난각이 얇아집니다.{' '}
        <b>사료 칼슘만 올려서는 교정되지 않으니</b> 환기·냉방으로 헐떡임 자체를 줄이는 것이
        우선입니다
      </Bullet>,
    );
  }

  if (climate.nightHsi !== null && climate.nightHsi >= 70) {
    items.push(
      <Bullet key="night" color="#5E35B1">
        🌙 <b>야간에도 식지 않습니다 (새벽 지수 {climate.nightHsi})</b> — 팬을 밤새 연속 가동해 야간
        냉각을 확보하세요. 밤에 열을 못 빼면 다음날 열부하가 누적됩니다
      </Bullet>,
    );
  }

  if (climate.diurnal !== null && climate.diurnal >= 12) {
    items.push(
      <Bullet key="diurnal" color="#C62828">
        🌡️ <b>일교차 {climate.diurnal}°C 경보</b> — 호흡기·CRD 발병 위험 구간. 새벽 최소환기량을
        낮추지 말고 온도만 보정하세요(환기 급감은 암모니아 축적으로 이어집니다)
      </Bullet>,
    );
  } else if (climate.diurnal !== null && climate.diurnal >= 8) {
    items.push(
      <Bullet key="diurnal" color="#EF6C00">
        🌡️ <b>일교차 {climate.diurnal}°C 주의</b> — 환기 단계가 급변하지 않도록 완충 구간을 두세요
      </Bullet>,
    );
  }

  if (climate.rainDays >= 3) {
    items.push(
      <Bullet key="rain" color="#0277BD">
        💧 <b>이번 주 강수 {climate.rainDays}일</b> — 깔짚 수분이 오르면 콕시듐(Eimeria)·대장균
        위험이 함께 오릅니다. 급수라인 누수부터 점검하세요
      </Bullet>,
    );
  } else if (climate.rainDays >= 1) {
    items.push(
      <Bullet key="rain" color="#0277BD">
        🌧 <b>강수 {climate.rainDays}일 예보</b> — 배수로·깔짚 건조 상태 점검
      </Bullet>,
    );
  }

  if (!hot && climate.tMax !== null && climate.tMax < 18) {
    items.push(
      <Bullet key="cool" color="#1565C0">
        ❄️ <b>낮 최고 {Math.round(climate.tMax)}°C</b> — 적온대(18~25°C) 아래로 떨어지는 시간대가
        있습니다. 새벽 보온과 최소환기량을 함께 확인하세요
      </Bullet>,
    );
  }

  if (climate.tMax !== null && climate.tMax >= 30) {
    items.push(
      <Bullet key="swine" color="#6D4C41">
        🐷 <b>양돈</b> — 모돈 사료섭취·수태율 저하 위험. 임신돈·포유돈 냉방을 우선 가동하세요 (PIC
        Wean to Finish Guidelines)
      </Bullet>,
    );
  } else if (climate.tMax !== null && climate.tMax < 10) {
    items.push(
      <Bullet key="swine" color="#6D4C41">
        🐷 <b>양돈</b> — 자돈 설사·폐사 위험. 보온등·매트와 이유자돈 구역난방 점검 (PIC Guidelines)
      </Bullet>,
    );
  }

  return items;
}

export function HusbandryPointsPanel({ climate, locationName }: Props) {
  const inRange = hsiInRange(climate.peakTemp);
  const level = inRange ? (hsiLevel(climate.hsi) ?? COLD_LEVEL) : COLD_LEVEL;
  const actions = HSI_ACTIONS[level.key as keyof typeof HSI_ACTIONS] ?? [];
  const hot = inRange && climate.hsi !== null && climate.hsi >= 70;

  const humidity = Math.round(climate.peakHumidity);
  // 육추~출하까지 고르게 네 개만. 표를 다 펴면 읽히지 않는다.
  const tiles = apparentTargets(humidity).filter((row) =>
    [44, 290, 790, 1530].includes(row.weight),
  );
  const ratio = waterFeedRatio(climate.peakTemp);

  return (
    <section
      className="rounded-[var(--radius-card)] border-t-4 bg-white p-5 shadow-[var(--shadow-card)]"
      style={{ borderTopColor: level.color }}
    >
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h2 className="text-sm font-bold">📋 오늘의 축산 관리 포인트</h2>
          <p className="mt-0.5 text-[10px] text-[var(--color-ink-muted)]">
            {locationName} · 한낮{' '}
            {climate.peakTemp !== null ? `${Math.round(climate.peakTemp)}°C` : '—'} · 습도{' '}
            {humidity}% · 습구 {climate.wetBulb !== null ? `${climate.wetBulb.toFixed(1)}°C` : '—'}
          </p>
        </div>
        <div
          className="min-w-[96px] rounded-[11px] px-3.5 py-2 text-center"
          style={{ background: level.bg }}
        >
          <p className="text-[9px] font-bold tracking-wide" style={{ color: level.color }}>
            열스트레스 지수
          </p>
          {inRange ? (
            <p className="text-2xl leading-tight font-extrabold" style={{ color: level.color }}>
              {climate.hsi}
            </p>
          ) : (
            <p className="py-1 text-xs leading-snug font-bold" style={{ color: level.color }}>
              판정범위
              <br />밖 (20°C↓)
            </p>
          )}
          <p className="text-[11px] font-bold" style={{ color: level.color }}>
            {level.icon} {level.label} <span className="text-[9px] opacity-70">{level.short}</span>
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-[10px] px-3 py-2.5" style={{ background: level.bg }}>
        <p className="mb-1 text-[11px] font-bold" style={{ color: level.color }}>
          {level.icon} 지금 해야 할 조치{' '}
          <span className="text-[9px] font-semibold opacity-75">
            {inRange ? 'Hy-Line 규정 조치' : 'Hy-Line 적온대 기준'}
          </span>
        </p>
        {actions.map((action) => (
          <Bullet key={action} color={level.color}>
            {action}
          </Bullet>
        ))}
      </div>

      {tiles.length > 0 ? (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-bold">
            🐔 오늘 습도({humidity}%)에 맞춘 목표 계사온도{' '}
            <span className="text-[9px] font-semibold text-[#aaa]">Aviagen 체감온도</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tiles.map((tile) => (
              <div
                key={tile.weight}
                className="min-w-[74px] flex-1 rounded-[9px] border-t-2 border-[#E8530A] bg-[#FFF8F3] px-1.5 py-2 text-center"
              >
                <p className="text-[9px] font-bold text-[#E8530A]">{tile.label}</p>
                <p className="text-[15px] font-extrabold">{tile.target.toFixed(1)}°</p>
                <p
                  className="text-[9px]"
                  style={{
                    color:
                      Math.abs(tile.delta) < 0.05
                        ? '#aaa'
                        : tile.delta < 0
                          ? 'var(--color-col-month)'
                          : 'var(--color-col-today)',
                  }}
                >
                  {Math.abs(tile.delta) < 0.05
                    ? '표준'
                    : `${tile.delta < 0 ? '▼' : '▲'}${Math.abs(tile.delta).toFixed(1)}°`}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] leading-relaxed text-[#aaa]">
            습도가 높으면 증발로 열을 못 버려 같은 온도라도 더 덥게 느낍니다 — 표시값은 습도 50%
            표준조건 대비 증감입니다. 컨트롤러 설정온도를 이 값으로 맞추되, 최종 판단은 계군
            행동(개구호흡·날개 벌림·밀집)으로 확인하세요.
          </p>
        </div>
      ) : null}

      <div className="mb-3">
        <p className="mb-1 text-[11px] font-bold">💧 오늘의 음수·급이 기준</p>
        {ratio !== null ? (
          <Bullet color="#0277BD">
            물:사료 비율 <b>약 {ratio.toFixed(1)} : 1</b> 예상 (21°C 2:1 → 38°C 8:1) — 급수미터
            실측값이 이보다 낮으면 급수 병목을 의심하세요
          </Bullet>
        ) : null}
        <Bullet color="#0277BD">
          니플 유량 <b>70 ml/분 이상</b> 확보 · 음수 온도는 <b>25°C 이하</b> 유지 (30°C 넘으면
          음수량이 떨어지고 사료섭취까지 같이 떨어집니다)
        </Bullet>
        {hot ? (
          <>
            <Bullet color="#0277BD">
              급이는 이른 아침·저녁으로 몰고, <b>심야급이 1~2시간</b>을 추가해 서늘한 시간대 섭취를
              늘리세요
            </Bullet>
            <Bullet color="#0277BD">
              전해질(Na·K·Cl·중탄산) 보충 — 급등을 <b>예상해서 미리</b> 투여할 때 효과가 가장 큽니다
            </Bullet>
          </>
        ) : null}
      </div>

      {(() => {
        const risks = riskFactors(climate, hot);
        if (risks.length === 0) return null;
        return (
          <div className="mb-1 border-t border-dashed border-black/[0.08] pt-2.5">
            <p className="mb-1 text-[11px] font-bold">⚠️ 오늘 함께 볼 위험요인</p>
            {risks}
          </div>
        );
      })()}

      <p className="mt-2 text-[9px] leading-relaxed text-[#aaa]">
        ※ 판정도구 출처: 열스트레스 지수는 Hy-Line Technical Update 「Understanding Heat Stress in
        Layers」 Figure 2의 온도×습도 표를 그대로 조회한 값 (표 캡션 공식 0.6×건구°F + 0.4×습구°F,
        원전 Xin &amp; Harmon, Iowa State Univ. 1998) · 목표 계사온도 = Aviagen 「Ross Broiler
        Management Handbook 2025」 Table 2.5 (Dr. Malcolm Mitchell, SRUC 공식). 계군 행동 관찰이
        최종 판단 기준입니다.
      </p>
    </section>
  );
}
