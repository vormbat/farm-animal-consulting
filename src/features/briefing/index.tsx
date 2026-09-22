import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { PanelError, PanelSkeleton, RefreshButton } from '@/components/PanelStatus';
import { useDataQuery } from '@/lib/useDataQuery';
import { BoardShortcuts } from './panels/BoardShortcuts';
import { OutletCard } from './panels/OutletCard';
import { CHANNELS, inChannel, isStale, outletList } from './outlets';

/**
 * 뉴스정보 탭.
 *
 * 원본은 이 화면에서 매체 여섯 곳을 **브라우저가 직접** 긁었다(공개 CORS 프록시
 * 네 곳을 돌려가며). 프록시가 죽으면 카드가 통째로 비었고, 20분짜리 캐시로
 * 그 빈도를 줄이는 것 말고는 손쓸 방법이 없었다.
 *
 * 여기서는 수집 단계가 만들어 둔 JSON 한 개만 읽는다. 외부 사이트로 나가는
 * 요청은 0회다.
 */

const CHANNEL_COLOR: Record<string, string> = {
  all: 'var(--color-header-from)',
  livestock: 'var(--color-channel-livestock)',
  policy: 'var(--color-channel-policy)',
  economy: 'var(--color-channel-economy)',
  society: 'var(--color-channel-society)',
  world: 'var(--color-channel-world)',
};

export default function BriefingTab() {
  const news = useDataQuery('news/briefing.json');
  const [channel, setChannel] = useState('all');

  const outlets = useMemo(() => (news.data ? outletList(news.data) : []), [news.data]);
  const visible = inChannel(outlets, channel);

  /** 채널마다 매체가 몇 곳인지. 비어 있는 채널은 탭에서 뺀다. */
  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const outlet of outlets) {
      tally.set(outlet.channel, (tally.get(outlet.channel) ?? 0) + 1);
    }
    return tally;
  }, [outlets]);

  const staleNames = news.data
    ? outlets.filter((outlet) => isStale(news.data, outlet)).map((outlet) => outlet.name)
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="display text-base">📰 매체별 최신 기사</h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
              매체마다 최신 5건 · 제목을 누르면 해당 매체의 기사로 바로 갑니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            {news.data ? (
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                수집 {news.data.collected_at}
              </span>
            ) : null}
            <RefreshButton onClick={() => void news.refresh()} busy={news.isFetching} />
          </div>
        </div>

        {news.data ? (
          <div
            role="tablist"
            aria-label="뉴스 채널"
            className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
          >
            {[{ id: 'all', label: `전체 ${outlets.length}` }, ...CHANNELS]
              .filter((tab) => tab.id === 'all' || (counts.get(tab.id) ?? 0) > 0)
              .map((tab) => {
                const active = tab.id === channel;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setChannel(tab.id)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors"
                    style={
                      active
                        ? {
                            background: CHANNEL_COLOR[tab.id],
                            borderColor: 'transparent',
                            color: '#fff',
                          }
                        : { borderColor: 'rgba(0,0,0,0.12)', color: 'var(--color-ink-muted)' }
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
          </div>
        ) : null}

        {news.isPending ? <PanelSkeleton rows={4} /> : null}
        {news.error && !news.data ? (
          <PanelError message={news.error.message} onRetry={() => void news.refetch()} />
        ) : null}

        {staleNames.length > 0 ? (
          <p className="mt-3 rounded-lg bg-[var(--color-col-yesterday-bg)] px-3 py-2 text-[11px] text-[var(--color-ink-muted)]">
            ⚡ {staleNames.join(' · ')}은(는) 이번 수집에 실패해 직전 기사를 보여 주고 있습니다.
            나머지 매체는 새로 받은 것입니다.
          </p>
        ) : null}
      </Card>

      {visible.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((outlet) => (
            <OutletCard
              key={outlet.id}
              outlet={outlet}
              stale={news.data ? isStale(news.data, outlet) : false}
            />
          ))}
        </div>
      ) : null}

      <BoardShortcuts />

      <p className="px-1 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
        기사는 각 매체의 공개 RSS 를 수집 단계(GitHub Actions)에서 모아 둔 것입니다. 저작권은 각
        매체에 있으며 제목과 링크만 싣습니다. 해외 기사 제목은 기계번역이라 원문과 어감이 다를 수
        있어, 제목에 마우스를 올리면 영문 원문이 보입니다.
      </p>
    </div>
  );
}
