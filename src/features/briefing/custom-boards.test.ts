import { describe, expect, it } from 'vitest';
import { addBoard, normalizeUrl, removeBoard, type CustomBoard } from './custom-boards';

/**
 * 사용자가 더한 게시판 바로가기.
 *
 * 여기서 지키는 건 주로 **주소 검사**다. 사용자가 친 문자열이 그대로 `href` 가
 * 되기 때문에, `javascript:` 같은 것이 통과하면 자기 화면에서 스크립트가 도는
 * 링크를 만들게 된다. 원본은 `/^https?:\/\//` 하나로만 봤다.
 */

const 빈목록: CustomBoard[] = [];

describe('normalizeUrl', () => {
  it('스킴을 안 쓰면 https 를 붙인다', () => {
    expect(normalizeUrl('poultry.or.kr/notice')).toBe('https://poultry.or.kr/notice');
  });

  it('http 는 그대로 둔다 — 아직 https 가 없는 협회 사이트가 있다', () => {
    expect(normalizeUrl('http://example.co.kr/bbs')).toBe('http://example.co.kr/bbs');
  });

  it('앞뒤 공백을 무시한다', () => {
    expect(normalizeUrl('  https://a.co.kr  ')).toBe('https://a.co.kr/');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>', 'file:///c:/', 'vbscript:msgbox'])(
    '%s 는 거부한다',
    (bad) => {
      expect(normalizeUrl(bad)).toBeNull();
    },
  );

  it('점 없는 이름은 주소가 아니다', () => {
    expect(normalizeUrl('localhost')).toBeNull();
    expect(normalizeUrl('그냥 글자')).toBeNull();
  });

  it('빈 값은 null', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
  });
});

describe('addBoard', () => {
  it('이름과 주소가 멀쩡하면 담는다', () => {
    const { boards, error } = addBoard(빈목록, '  우리축협  ', 'chuknh.co.kr/notice');
    expect(error).toBeUndefined();
    expect(boards).toHaveLength(1);
    expect(boards[0]?.name).toBe('우리축협');
    expect(boards[0]?.url).toBe('https://chuknh.co.kr/notice');
  });

  it('이름이 비면 거절하고 목록을 그대로 돌려준다', () => {
    const { boards, error } = addBoard(빈목록, '   ', 'a.co.kr');
    expect(error).toContain('이름');
    expect(boards).toBe(빈목록);
  });

  it('주소가 이상하면 거절한다', () => {
    expect(addBoard(빈목록, '이름', 'javascript:alert(1)').error).toContain('주소');
  });

  it('같은 주소는 두 번 담지 않는다', () => {
    const first = addBoard(빈목록, '가', 'a.co.kr/notice').boards;
    const second = addBoard(first, '나', 'https://a.co.kr/notice');
    expect(second.error).toContain('이미');
    expect(second.boards).toHaveLength(1);
  });

  it('스무 개를 넘기지 않는다', () => {
    let boards: CustomBoard[] = [];
    for (let index = 0; index < 20; index += 1) {
      boards = addBoard(boards, `게시판${index}`, `a${index}.co.kr`).boards;
    }
    expect(boards).toHaveLength(20);
    const over = addBoard(boards, '스물하나', 'over.co.kr');
    expect(over.error).toContain('20');
    expect(over.boards).toHaveLength(20);
  });
});

describe('removeBoard', () => {
  it('id 로 하나만 뺀다', () => {
    const boards = [
      { id: 'a', name: '가', url: 'https://a.co.kr/' },
      { id: 'b', name: '나', url: 'https://b.co.kr/' },
    ];
    expect(removeBoard(boards, 'a')).toEqual([boards[1]]);
  });

  it('없는 id 는 아무것도 바꾸지 않는다', () => {
    const boards = [{ id: 'a', name: '가', url: 'https://a.co.kr/' }];
    expect(removeBoard(boards, 'zzz')).toEqual(boards);
  });
});
