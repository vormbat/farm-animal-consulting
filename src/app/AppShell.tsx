import { Suspense, useMemo } from 'react';
import { getTab } from '@/lib/tabs';
import { isEmbedded } from '@/lib/embed';
import { formatKstShortDate } from '@/lib/format';
import { useTabNavigation } from './useTabNavigation';
import { TabBar } from './TabBar';
import { SiteFooter } from './SiteFooter';
import { ErrorBoundary } from './ErrorBoundary';

function TabFallback() {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="h-4 w-32 animate-pulse rounded bg-black/10" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-black/5" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-black/5" />
    </div>
  );
}

export function AppShell() {
  const { tab, setTab } = useTabNavigation();
  const embedded = useMemo(isEmbedded, []);
  const { Component } = getTab(tab);

  return (
    <>
      <header
        className="sticky top-0 z-50 bg-linear-(--header-gradient) px-5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.2)] max-sm:px-2.5"
        style={
          {
            '--header-gradient': '90deg, var(--color-header-from) 0%, var(--color-header-to) 100%',
          } as React.CSSProperties
        }
      >
        <div className="mx-auto max-w-[900px]">
          {!embedded && (
            <div className="flex items-start justify-between gap-2 pt-3.5 pb-2 max-sm:pt-2.5 max-sm:pb-1.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-lg"
                >
                  🐔
                </span>
                <div className="min-w-0">
                  <h1 className="display truncate text-lg leading-tight">농장동물 컨설팅</h1>
                  <p className="truncate text-[11px] text-white/70">
                    시세 · 사양환경 · 환기 컨설팅 · 뉴스
                  </p>
                </div>
              </div>
              <div className="shrink-0 pt-1 text-sm font-bold text-[var(--color-tab-accent)]">
                {formatKstShortDate()}
              </div>
            </div>
          )}
          <div className={embedded ? 'pt-2' : undefined}>
            <TabBar active={tab} onSelect={setTab} />
          </div>
        </div>
      </header>

      <main
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mx-auto max-w-[900px] px-4 pt-5 pb-10"
      >
        <ErrorBoundary resetKey={tab}>
          <Suspense fallback={<TabFallback />}>
            <Component />
          </Suspense>
        </ErrorBoundary>
      </main>

      <SiteFooter />
    </>
  );
}
