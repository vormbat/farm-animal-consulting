import { createStore } from '@/lib/storage';

/**
 * 사용자가 더한 게시판 바로가기.
 *
 * 브라우저에만 남는다. 원본도 그랬고(`poultry_custom_boards`) 그대로 둔다 —
 * 이 목록은 농가마다 다르고, 저장소에 올리면 남의 화면에도 뜬다.
 *
 * 옮겨오지 않은 것이 하나 있다. 원본은 `prompt()` 로 이름과 주소를 받았다.
 * 그 창은 iframe 안에서 브라우저가 막기도 하고, 무엇보다 잘못 쳤을 때 고칠
 * 방법이 없다. 여기서는 화면 안의 입력칸으로 받는다.
 */

export interface CustomBoard {
  id: string;
  name: string;
  url: string;
}

const MAX = 20;

function isBoardList(value: unknown): value is CustomBoard[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as CustomBoard).id === 'string' &&
        typeof (row as CustomBoard).name === 'string' &&
        typeof (row as CustomBoard).url === 'string',
    )
  );
}

export const customBoardStore = createStore<CustomBoard[]>('custom-boards', 1, [], isBoardList);

/** 주소가 우리가 열어 줄 만한 것인지. `javascript:` 같은 것을 막는다. */
export function normalizeUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function addBoard(
  boards: CustomBoard[],
  name: string,
  rawUrl: string,
): { boards: CustomBoard[]; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { boards, error: '이름을 입력하세요.' };
  const url = normalizeUrl(rawUrl);
  if (!url) return { boards, error: '주소를 확인하세요. 예: poultry.or.kr/notice' };
  if (boards.length >= MAX) return { boards, error: `바로가기는 ${MAX}개까지 담을 수 있습니다.` };
  if (boards.some((board) => board.url === url)) return { boards, error: '이미 담긴 주소입니다.' };

  return {
    boards: [...boards, { id: `custom-${Date.now()}`, name: trimmed, url }],
  };
}

export function removeBoard(boards: CustomBoard[], id: string): CustomBoard[] {
  return boards.filter((board) => board.id !== id);
}
