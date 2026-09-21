import type { Disease } from '@/types/data/disease';

/**
 * 질병 한 종.
 *
 * 접혀 있을 때는 발췌 한 줄만, 펴면 문단과 사진을 전부 보여 준다.
 * 54종을 전부 펴 두면 사진 300여 장이 한꺼번에 걸려 화면이 멈춘다 —
 * 그래서 사진은 펼친 뒤에야 DOM 에 들어가고, 그마저 `loading="lazy"` 다.
 */

interface Props {
  disease: Disease;
  open: boolean;
  onToggle: () => void;
  /** 접혀 있을 때 보여 줄 한 줄 */
  excerpt: string;
  /** 이달의 질병으로 지목된 종 */
  picked?: boolean;
}

export function DiseaseEntry({ disease, open, onToggle, excerpt, picked = false }: Props) {
  const panelId = `disease-${disease.slug}`;

  return (
    <article className="border-t border-black/[0.06] first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-2 py-3 text-left hover:bg-black/[0.015]"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-bold">{disease.title_ko}</span>
            {picked ? (
              <span className="rounded-full bg-[var(--color-brand-egg-bg)] px-2 py-0.5 text-[10px] font-bold text-[#8a6508]">
                📌 이달의 질병
              </span>
            ) : null}
            <span className="text-[10px] text-[var(--color-ink-muted)]">{disease.title_en}</span>
          </p>
          {disease.aliases.length > 0 ? (
            <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
              {disease.aliases.join(' · ')}
            </p>
          ) : null}
          {!open ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#555]">{excerpt}</p>
          ) : null}
        </div>
        <span
          aria-hidden
          className="mt-1 shrink-0 text-[11px] text-[var(--color-ink-muted)] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          ▼
        </span>
      </button>

      {open ? (
        <div id={panelId} className="pb-4">
          {disease.paragraphs.map((paragraph, index) => (
            <div key={index} className="mb-3">
              {paragraph.image ? (
                <img
                  src={paragraph.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="mb-1.5 max-h-[280px] w-full rounded-lg object-contain"
                />
              ) : null}
              <p className="text-[13px] leading-relaxed">{paragraph.ko}</p>
            </div>
          ))}
          <a
            href={disease.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-block rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
          >
            영문 원문 ↗
          </a>
        </div>
      ) : null}
    </article>
  );
}
