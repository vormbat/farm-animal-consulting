import { describe, expect, it } from 'vitest';
import { DEFAULT_TAB, TABS, getTab, isTabId } from './tabs';

describe('탭 레지스트리', () => {
  it('탭 id 는 서로 겹치지 않는다', () => {
    const ids = TABS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('farm-pro 와 맺은 해시 계약의 탭 id 를 모두 유지한다', () => {
    // 이 목록은 원본 사이트의 TAB_IDS 다. 부모 화면이 `#vent` 같은 해시로
    // 탭을 지정하므로 이름이 바뀌면 임베드가 깨진다.
    expect(TABS.map((t) => t.id)).toEqual([
      'price',
      'weather',
      'vent',
      'consult',
      'disease',
      'hpai',
      'briefing',
      'premium',
    ]);
  });

  it('기본 탭은 레지스트리에 있는 값이다', () => {
    expect(isTabId(DEFAULT_TAB)).toBe(true);
  });

  it('isTabId 는 등록되지 않은 값을 거른다', () => {
    expect(isTabId('price')).toBe(true);
    expect(isTabId('__nope__')).toBe(false);
    expect(isTabId(null)).toBe(false);
    expect(isTabId(undefined)).toBe(false);
  });

  it('getTab 은 등록된 정의를 돌려준다', () => {
    expect(getTab('price').label).toBe('양계 산지시세');
  });
});
