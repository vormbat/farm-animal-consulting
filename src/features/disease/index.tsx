import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardTitle } from '@/components/Card';
import { PanelError, PanelSkeleton } from '@/components/PanelStatus';
import { dataClient } from '@/lib/data-client';
import { useDataQuery } from '@/lib/useDataQuery';
import { DiseaseEntry } from './panels/DiseaseEntry';
import { MonthlyPicks } from './panels/MonthlyPicks';
import { buildIndex, excerpt, search } from './search';

/**
 * 양계질병 탭.
 *
 * 사전이 300KB 라 이 탭에 들어올 때만 받는다(탭 자체가 lazy 청크이고, 사전은
 * 그 안에서 처음 렌더될 때 요청된다). 검색 색인도 받은 뒤 한 번만 만든다.
 *
 * 처음에는 목록을 펴 두지 않는다. 54종을 모두 펴면 사진 300여 장이 한꺼번에
 * 걸린다 — 이달의 질병과 검색 결과만 먼저 보여 주고, 나머지는 '전체보기' 를
 * 눌렀을 때 펼친다.
 */

const PICKS_PATH = 'disease/monthly-picks.json';

function useMonthlyPicks() {
  return useQuery({
    queryKey: ['editorial', PICKS_PATH],
    queryFn: ({ signal }) => dataClient.getEditorial(PICKS_PATH, { signal }),
    // 사람이 고쳐 발행하는 파일이라 자주 바뀌지 않는다.
    staleTime: 30 * 60 * 1000,
  });
}

export default function DiseaseTab() {
  const book = useDataQuery('disease/diseases.json');
  const picks = useMonthlyPicks();

  const [query, setQuery] = useState('');
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const index = useMemo(() => (book.data ? buildIndex(book.data) : []), [book.data]);
  const bySlug = useMemo(
    () => new Map((book.data?.diseases ?? []).map((disease) => [disease.slug, disease])),
    [book.data],
  );

  /** 이번 달을 포함해 지목된 적 있는 슬러그. 목록에서 표시한다. */
  const pickedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const rows of Object.values(picks.data?.picks ?? {})) {
      for (const row of rows) if (row.slug) slugs.add(row.slug);
    }
    return slugs;
  }, [picks.data]);

  const hits = useMemo(() => search(index, query), [index, query]);
  const searching = query.trim().length > 0;

  const visible = searching
    ? hits.map((hit) => hit.disease)
    : showAll
      ? (book.data?.diseases ?? [])
      : (book.data?.diseases ?? []).filter((disease) => pickedSlugs.has(disease.slug));

  function open(slug: string) {
    setOpenSlug(slug);
    setQuery('');
    setShowAll(true);
    // 목록이 길어 펼친 항목이 화면 밖일 수 있다. 다음 프레임에 맞춰 옮긴다.
    requestAnimationFrame(() => {
      document.getElementById(`entry-${slug}`)?.scrollIntoView({ block: 'center' });
    });
  }

  return (
    <div className="space-y-4">
      {picks.data && book.data ? (
        <MonthlyPicks picks={picks.data} bySlug={bySlug} onOpen={open} />
      ) : null}

      <Card>
        <CardTitle icon="🩺" note={book.data ? `${book.data.count}종` : undefined}>
          양계질병 사전
        </CardTitle>

        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="뉴캐슬병, 콕시듐, 마렉, 감보로, 설사, 기침 …"
            aria-label="질병 검색"
            className="min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
            >
              지우기
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--color-ink-muted)]">
          병명뿐 아니라 증상 본문도 함께 검색됩니다 — 농가가 들고 오는 것은 병명이 아니라
          증상입니다. 본문이 기계번역이라 현장 표현(녹변 등)은 안 걸릴 수 있으니 낱말을 바꿔 보세요.
        </p>

        {book.isPending ? <PanelSkeleton rows={5} /> : null}
        {book.error && !book.data ? (
          <PanelError message={book.error.message} onRetry={() => void book.refetch()} />
        ) : null}

        {book.data ? (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold">
                {searching
                  ? `검색 결과 ${hits.length}종`
                  : showAll
                    ? `전체 ${book.data.count}종`
                    : `📌 이달의 질병 ${visible.length}종`}
              </p>
              {!searching ? (
                <button
                  type="button"
                  onClick={() => setShowAll((previous) => !previous)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
                >
                  {showAll ? '이달의 질병만' : `전체보기 ${book.data.count}종`}
                </button>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                {searching
                  ? `'${query}' 로 찾은 질병이 없습니다. 낱말을 줄여 보세요.`
                  : '이달에 지목된 질병이 없습니다. 전체보기로 사전을 열어 보세요.'}
              </p>
            ) : (
              <div className="mt-1">
                {visible.map((disease) => (
                  <div key={disease.slug} id={`entry-${disease.slug}`}>
                    <DiseaseEntry
                      disease={disease}
                      open={openSlug === disease.slug}
                      onToggle={() =>
                        setOpenSlug((previous) => (previous === disease.slug ? null : disease.slug))
                      }
                      excerpt={excerpt(disease, query)}
                      picked={pickedSlugs.has(disease.slug)}
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
              {book.data.note}
              <br />
              출처:{' '}
              <a
                href={book.data.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                The Poultry Site — Diseases of Poultry ↗
              </a>{' '}
              · {book.data.count}종 · 수집 {book.data.collected_at}
            </p>
          </>
        ) : null}
      </Card>
    </div>
  );
}
