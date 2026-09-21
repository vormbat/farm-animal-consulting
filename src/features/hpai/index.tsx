import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton, RefreshButton, StaleBadge } from '@/components/PanelStatus';
import { useDataQuery } from '@/lib/useDataQuery';
import { formatNumber } from '@/lib/format';
import type { Hpai } from '@/types/data/hpai';
import { LEVELS, POULTRY_COLOR, WILD_COLOR, regionName } from './labels';
import { CountryTable, SpeciesBar } from './panels/CountryTable';

/**
 * AI 발생예측통계 탭.
 *
 * 이름은 '예측'이지만 **이 화면은 위험도 점수가 아니라 관측된 신고 기록이다.**
 * 전 세계 국가별 위험도를 한 숫자로 내주는 공개 모델이 없기 때문이다.
 * 그래서 숫자를 지어내지 않고, 분류 규칙을 화면에 그대로 띄워 사용자가 무엇을
 * 보고 있는지 알게 한다 — 근거를 감춘 점수가 가장 위험하다.
 *
 * 야생조류 검출을 가금 발생 옆에 나란히 두는 이유는 EFSA 분기보고가 가금
 * 발생의 90% 이상을 야생조류로부터의 1차 유입으로 보고하기 때문이다.
 */

function Summary({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div className="min-w-[110px] flex-1 rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]">
      <p className="text-[11px] text-[var(--color-ink-muted)]">{label}</p>
      <p className="mt-1 text-[22px] leading-none font-extrabold">{value}</p>
      {sub ? <p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">{sub}</p> : null}
    </div>
  );
}

/** 한 줄 요약. 숫자를 나열하는 대신 "지금 무엇을 봐야 하는가"로 옮긴다. */
function headline(data: Hpai): string {
  const parts = [
    `최근 ${data.window_days}일간 ${data.overall.countries}개국 ${data.overall.total}건 신고, ` +
      `이 중 ${data.overall.ongoing}건 진행중`,
  ];
  const top = data.regions[0];
  if (top) parts.push(`${regionName(top.name)}이 ${top.total}건으로 가장 많음`);
  parts.push(
    data.korea
      ? `국내 진행중 ${data.korea.ongoing}건 (최근 ${data.korea.latest})`
      : '국내 신고 없음',
  );
  if (data.flyway.ongoing > 0) {
    parts.push(`한반도 철새경로(EAAF)에서도 ${data.flyway.ongoing}건 진행중 — 국내 유입 경계 필요`);
  }
  return parts.join(' · ');
}

export default function HpaiTab() {
  const { data, isPending, isFetching, error, refresh, refetch } = useDataQuery('hpai/latest.json');

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle icon="🦠" note={data ? `업데이트 ${data.collected_at}` : undefined}>
            AI 발생 현황
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {data?.stale ? <StaleBadge fields={data.stale_fields} /> : null}
            <RefreshButton onClick={() => void refresh()} busy={isFetching} />
          </div>
        </div>

        {isPending ? <PanelSkeleton rows={4} /> : null}
        {error && !data ? (
          <PanelError message={error.message} onRetry={() => void refetch()} />
        ) : null}

        {data ? (
          <>
            <p className="mb-3 rounded-xl bg-[var(--color-col-today-bg)] px-3.5 py-2.5 text-[13px] leading-relaxed font-semibold text-[#8a1c1c]">
              💬 {headline(data)}
            </p>

            <div className="flex flex-wrap gap-2.5">
              <Summary
                label={`최근 ${data.window_days}일`}
                value={`${data.overall.countries}개국 ${formatNumber(data.overall.total)}건`}
              />
              <Summary label="🐔 가금" value={formatNumber(data.overall.poultry)} />
              <Summary label="🦆 야생조류" value={formatNumber(data.overall.wild)} />
              <Summary label="진행중" value={formatNumber(data.overall.ongoing)} />
            </div>

            <p className="mt-3 rounded-lg bg-[#FAFAFA] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
              <b>이 화면은 위험도 점수가 아니라 관측된 신고 기록입니다.</b>
              <br />
              {data.level_rule}
              <br />
              가금 발생의 90% 이상이 야생조류로부터의 1차 유입이라는 EFSA 분기보고 결과에 따라,
              야생조류 검출을 가금 발생의 선행 관찰 지표로 함께 표시합니다.
            </p>
          </>
        ) : null}
      </Card>

      {data ? (
        <>
          <Card>
            <CardTitle icon="🇰🇷">국내 현황</CardTitle>
            {data.korea ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  className="min-w-[96px] rounded-xl px-3.5 py-2.5 text-center"
                  style={{ background: LEVELS[data.korea.level].bg }}
                >
                  <p
                    className="text-sm font-extrabold"
                    style={{ color: LEVELS[data.korea.level].color }}
                  >
                    {LEVELS[data.korea.level].label}
                  </p>
                </div>
                <Summary
                  label={`신고 (최근 ${data.window_days}일)`}
                  value={`${formatNumber(data.korea.total)}건`}
                  sub={`진행중 ${data.korea.ongoing}건`}
                />
                <Summary label="🐔 가금" value={formatNumber(data.korea.poultry)} />
                <Summary label="🦆 야생조류" value={formatNumber(data.korea.wild)} />
                <Summary
                  label="최근 신고"
                  value={data.korea.latest ?? '—'}
                  sub={data.korea.first ? `최초 발생 ${data.korea.first}` : undefined}
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">
                최근 {data.window_days}일 안에 국내 신고가 없습니다.
              </p>
            )}
          </Card>

          <Card>
            <CardTitle icon="🦆" note={data.flyway.note}>
              {data.flyway.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2.5">
              <Summary label="경로상 국가" value={`${data.flyway.countries}개국`} />
              <Summary
                label="신고"
                value={`${formatNumber(data.flyway.total)}건`}
                sub={`가금 ${data.flyway.poultry} · 야생조류 ${data.flyway.wild}`}
              />
              <Summary label="진행중" value={formatNumber(data.flyway.ongoing)} />
            </div>
            <div className="mt-3">
              <CountryTable rows={data.flyway.countries_list} />
            </div>
          </Card>

          <Card>
            <CardTitle icon="🌍">대륙별 신고 현황</CardTitle>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
              {data.regions.map((region) => (
                <div
                  key={region.name}
                  className="rounded-[14px] bg-white px-[15px] py-3.5 shadow-[0_1px_6px_rgb(0_0_0/0.07)]"
                >
                  <p className="text-xs font-bold">
                    {regionName(region.name)}{' '}
                    <span className="font-medium text-[var(--color-ink-muted)]">
                      {region.countries}개국
                    </span>
                  </p>
                  <p className="mt-1 text-[18px] leading-none font-extrabold">
                    {formatNumber(region.total)}건
                    <span className="ml-1.5 text-[11px] text-[var(--color-ink-muted)]">
                      진행중 {region.ongoing}
                    </span>
                  </p>
                  <SpeciesBar poultry={region.poultry} wild={region.wild} className="mt-2" />
                  <p className="mt-1.5 text-[10px] text-[var(--color-ink-muted)]">
                    {region.top.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle icon="📊" note={`최근 ${data.window_days}일`}>
              신고 상위국
            </CardTitle>
            <CountryTable rows={data.countries.slice(0, 15)} ranked showRegion />
            <div className="mt-2 flex gap-3 text-[10px] text-[var(--color-ink-muted)]">
              <span>
                <span
                  aria-hidden
                  className="mr-1 inline-block h-2 w-2 rounded-[2px] align-middle"
                  style={{ background: POULTRY_COLOR }}
                />
                가금
              </span>
              <span>
                <span
                  aria-hidden
                  className="mr-1 inline-block h-2 w-2 rounded-[2px] align-middle"
                  style={{ background: WILD_COLOR }}
                />
                야생조류·비가금
              </span>
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-ink-muted)]">
              출처: {data.source_name} · 수집 {data.collected_at} ·{' '}
              <a
                href={data.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                WAHIS 원문 ↗
              </a>
            </p>
          </Card>
        </>
      ) : null}
    </div>
  );
}
