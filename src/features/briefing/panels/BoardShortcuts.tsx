import { useState } from 'react';
import { Card, CardTitle } from '@/components/Card';
import { BOARD_SITES } from '@/data/boards';
import { addBoard, customBoardStore, removeBoard, type CustomBoard } from '../custom-boards';

/**
 * 협회·매체 게시판 바로가기.
 *
 * 기사를 모아 오는 것과는 다른 일이다. 공지·입찰·관측정보처럼 농가가 직접
 * 들어가 봐야 하는 곳들이라 목록만 준다.
 */

export function BoardShortcuts() {
  const [custom, setCustom] = useState<CustomBoard[]>(() => customBoardStore.read());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function save(next: CustomBoard[]) {
    setCustom(next);
    customBoardStore.write(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = addBoard(custom, name, url);
    if (result.error) {
      setError(result.error);
      return;
    }
    save(result.boards);
    setName('');
    setUrl('');
    setError('');
    setOpen(false);
  }

  return (
    <Card>
      <CardTitle icon="🔖" note="공지 · 입찰 · 관측정보">
        게시판 바로가기
      </CardTitle>

      <div className="grid gap-3 sm:grid-cols-2">
        {BOARD_SITES.map((site) => (
          <div key={site.id} className="rounded-xl border border-black/[0.07] p-3">
            <a
              href={site.home}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[13px] font-bold"
              style={{ color: site.color }}
            >
              {site.icon} {site.name} ↗
            </a>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {site.boards.map((board) => (
                <a
                  key={board.url + board.label}
                  href={board.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-semibold hover:bg-black/[0.08]"
                >
                  {board.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {custom.length > 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-black/15 p-3">
          <p className="mb-2 text-[11px] font-bold text-[var(--color-ink-muted)]">
            내가 추가한 곳 · 이 브라우저에만 저장됩니다
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {custom.map((board) => (
              <li key={board.id} className="flex items-center rounded-full bg-black/[0.04] pr-1">
                <a
                  href={board.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="py-1 pl-2.5 text-[11px] font-semibold"
                >
                  {board.name}
                </a>
                <button
                  type="button"
                  onClick={() => save(removeBoard(custom, board.id))}
                  aria-label={`${board.name} 삭제`}
                  className="ml-1 px-1.5 text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-col-today)]"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {open ? (
        <form onSubmit={submit} className="mt-3 rounded-xl bg-black/[0.03] p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="이름 (예: 우리지역 축협)"
              aria-label="게시판 이름"
              className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="주소 (예: nonghyup.com/notice)"
              aria-label="게시판 주소"
              inputMode="url"
              className="min-w-0 flex-[1.4] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[var(--color-header-from)] px-4 py-2 text-xs font-bold text-white"
            >
              담기
            </button>
          </div>
          {error ? <p className="mt-2 text-[11px] text-[var(--color-col-today)]">{error}</p> : null}
        </form>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((previous) => !previous);
          setError('');
        }}
        className="mt-3 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-muted)] hover:bg-black/[0.03]"
      >
        {open ? '닫기' : '+ 자주 가는 게시판 추가'}
      </button>
    </Card>
  );
}
