import { useMemo } from 'react';
import { daysSince, daysUntil, progressPercent, solarTermInfo } from '@/lib/solar-terms';

/**
 * 오늘의 절기.
 *
 * 절기는 날짜표가 아니라 태양 황경으로 그때그때 계산한다 —
 * 자세한 이유는 `src/lib/solar-terms.ts` 에 적어 두었다.
 *
 * '유래·풍속' 과 '이 절기의 가축사육' 을 나란히 두는 것이 이 카드의 요점이다.
 * 절기는 농가에 익숙한 시간 감각이고, 거기에 사양관리 조언을 붙이면
 * "지금 무엇을 챙길 때인지"가 달력보다 잘 읽힌다.
 */
/** `9월 7일` — 한국어 로케일이 '월/일' 표기를 그대로 내준다. */
const MONTH_DAY = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
});

export function SolarTermPanel() {
  // 절기는 하루에 한 번 바뀌면 충분하다. 렌더마다 이분법을 다시 돌리지 않는다.
  const { info, since, until, percent } = useMemo(() => {
    const now = new Date();
    const computed = solarTermInfo(now);
    return {
      info: computed,
      since: daysSince(computed.current, now),
      until: daysUntil(computed.next, now),
      percent: progressPercent(computed, now),
    };
  }, []);

  const current = info.current.term;
  const next = info.next.term;

  return (
    <section className="rounded-[var(--radius-card)] border-t-4 border-[#7A5C00] bg-gradient-to-b from-[#FFFDF5] to-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-[150px] flex-1">
          <p className="text-[10px] font-bold tracking-wide text-[#B8860B]">오늘의 절기</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="display text-2xl text-[#7A5C00]">{current.name}</h2>
            <span className="text-xs text-[#A08A50]">{current.hanja}</span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              {MONTH_DAY.format(info.current.at)} 시작 · {since}일째
            </span>
          </div>
        </div>
        <div className="min-w-[110px] text-right">
          <p className="text-[10px] font-bold text-[var(--color-ink-muted)]">다음 절기</p>
          <p className="mt-0.5 text-[15px] font-extrabold text-[#555]">{next.name}</p>
          <p className="text-[11px] text-[var(--color-ink-muted)]">
            {MONTH_DAY.format(info.next.at)} · <b className="text-[#B8860B]">D-{until}</b>
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-[7px] overflow-hidden rounded bg-[#F3EFE0]"
        role="img"
        aria-label={`${current.name}에서 ${next.name}까지 ${Math.round(percent)}% 지남`}
      >
        <div className="h-full bg-[#B8860B]" style={{ width: `${percent.toFixed(1)}%` }} />
      </div>
      <div className="mt-1 mb-2 flex justify-between text-[9px] text-[#bbb]">
        <span>{current.name}</span>
        <span>{next.name}</span>
      </div>

      <div className="rounded-lg border border-[#F0E0A0] bg-[#FFFBEA] px-3 py-2.5 text-[12.5px] leading-[1.8] text-[#5A4A20]">
        <span className="mb-0.5 block text-[10px] font-bold text-[#B8860B]">유래 · 풍속</span>
        {current.story}
      </div>

      <div className="mt-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2.5 text-[12.5px] leading-[1.8]">
        <span className="mb-0.5 block text-[10px] font-bold text-[var(--color-ink-muted)]">
          🐔 이 절기의 가축사육
        </span>
        {current.farm}
      </div>

      <p className="mt-2.5 text-right text-[10px] text-[#bbb]">
        절기는 태양 황경 기준으로 매년 자동 계산됩니다
      </p>
    </section>
  );
}
