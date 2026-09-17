import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton, RefreshButton, SourceFooter } from '@/components/PanelStatus';
import { useDataQuery } from '@/lib/useDataQuery';

/**
 * 주간 계란 수급 정보.
 *
 * 농식품부·축평원·대한양계협회·식용란선별포장업협회·한국계란산업협회가
 * 매주 함께 내는 보고서를 절 단위로 보여준다. 누가 한 말인지가 중요해서
 * (기관마다 보는 각도가 다르다) 문단마다 기관 이름을 붙인다.
 *
 * 숫자 표(수급강도·재고기간·산지가격)는 담지 않는다. 원문 PDF 에서 보는 편이
 * 정확하고, 화면에서는 문장이 더 쓸모 있다.
 */
export function EggReportPanel() {
  const { data, isPending, isFetching, error, refresh, refetch } =
    useDataQuery('price/egg_report.json');

  // 머리글(◆)은 위에 따로 크게 보여주므로 절 안에서는 뺀다.
  const sections = (data?.sections ?? [])
    .map((section) => ({
      ...section,
      bullets: section.bullets.filter(
        (bullet) => bullet.org !== null || bullet.text !== data?.headline,
      ),
    }))
    .filter((section) => section.bullets.length > 0);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle icon="📋" note={data?.period ?? undefined}>
          주간 계란 수급 정보
        </CardTitle>
        <RefreshButton onClick={() => void refresh()} busy={isFetching} />
      </div>

      {isPending ? <PanelSkeleton rows={4} /> : null}

      {error && !data ? (
        <PanelError message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{data.title}</p>
            <a
              href={data.post_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-black/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
            >
              원문 게시판 ↗
            </a>
            {data.pdf_url ? (
              <a
                href={data.pdf_url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg border border-black/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
              >
                PDF ↓
              </a>
            ) : null}
          </div>

          {data.headline ? (
            <p className="mt-3 rounded-xl bg-[var(--color-brand-egg-bg)] px-3.5 py-2.5 text-[13px] font-bold text-[#8a6508]">
              ◆ {data.headline}
            </p>
          ) : null}

          <div className="mt-3 space-y-4">
            {sections.map((section) => (
              <section key={section.number}>
                <h3 className="text-[13px] font-bold">
                  <span className="mr-1.5 inline-block rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px]">
                    {section.number}
                  </span>
                  {section.title}
                </h3>
                <ul className="mt-1.5 space-y-2">
                  {section.bullets.map((bullet, index) => (
                    <li key={index} className="text-[13px] leading-relaxed">
                      {bullet.org ? (
                        <span className="mr-1.5 rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-[var(--color-ink-muted)]">
                          {bullet.org}
                        </span>
                      ) : null}
                      {bullet.text}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <SourceFooter
            note={data.posted_at ? `게시 ${data.posted_at}` : undefined}
            collectedAt={data.collected_at}
            sourceName="축산물품질평가원 다봄"
            sourceUrl={data.source_url}
          />
        </>
      ) : null}
    </Card>
  );
}
