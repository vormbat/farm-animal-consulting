import { describe, expect, it } from 'vitest';
import { TABS } from '@/lib/tabs';
import { nextTab } from './tab-keys';

const FIRST = TABS[0].id;
// 튜플이지만 계산한 인덱스라 타입에는 undefined 가 섞인다. 탭은 늘 하나 이상이다.
const LAST = (TABS[TABS.length - 1] ?? TABS[0]).id;

describe('탭바 키보드 이동', () => {
  it('오른쪽·왼쪽으로 한 칸씩 간다', () => {
    expect(nextTab('ArrowRight', FIRST)).toBe(TABS[1].id);
    expect(nextTab('ArrowLeft', TABS[1].id)).toBe(FIRST);
  });

  it('끝에서는 반대편으로 넘어간다', () => {
    expect(nextTab('ArrowRight', LAST)).toBe(FIRST);
    expect(nextTab('ArrowLeft', FIRST)).toBe(LAST);
  });

  it('Home·End 로 양 끝으로 간다', () => {
    expect(nextTab('Home', LAST)).toBe(FIRST);
    expect(nextTab('End', FIRST)).toBe(LAST);
  });

  it('다루지 않는 키는 null — 브라우저 기본 동작을 막지 않는다', () => {
    for (const key of ['Enter', ' ', 'Tab', 'ArrowUp', 'a']) {
      expect(nextTab(key, FIRST)).toBeNull();
    }
  });
});
