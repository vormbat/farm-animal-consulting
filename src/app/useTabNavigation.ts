import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_TAB, isTabId, type TabId } from '@/lib/tabs';
import { readParentTabMessage } from '@/lib/embed';

function readTabFromHash(): TabId | null {
  const raw = window.location.hash.replace(/^#/, '');
  return isTabId(raw) ? raw : null;
}

/**
 * 활성 탭 상태.
 *
 * 라우터를 쓰지 않고 해시를 직접 읽는다. 원본이 farm-pro 와 맺은 계약이
 * `#price` (슬래시 없음) 이기 때문이다. HashRouter 는 `#/price` 를 만들어
 * 이 계약을 깨뜨린다.
 */
export function useTabNavigation() {
  const [tab, setTabState] = useState<TabId>(() => readTabFromHash() ?? DEFAULT_TAB);

  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    if (window.location.hash.replace(/^#/, '') !== next) {
      window.location.hash = next;
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = readTabFromHash();
      if (next) setTabState(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    // 보내는 쪽 출처를 따로 막지 않는 것은, 이 메시지로 할 수 있는 일이
    // "이미 공개된 탭 하나를 보여주는 것" 뿐이고 값도 TAB_IDS 에 있는
    // 이름만 통과하기 때문이다(원본과 동일한 판단).
    const onMessage = (event: MessageEvent) => {
      const requested = readParentTabMessage(event.data);
      if (isTabId(requested)) setTabState(requested);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return { tab, setTab };
}
