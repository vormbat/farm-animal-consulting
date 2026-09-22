import { TABS, type TabId } from '@/lib/tabs';

/**
 * 탭 목록에서 키보드로 옮겨 갈 다음 탭. 해당 없으면 null.
 *
 * 좌우는 끝에서 반대편으로 넘어간다(WAI-ARIA tabs 패턴). Home·End 도 받는다 —
 * 탭이 여덟 개라 좁은 화면에서는 옆으로 스크롤되는데, 화살표로만 가면
 * 끝까지 여덟 번을 눌러야 한다.
 */
export function nextTab(key: string, active: TabId): TabId | null {
  const index = TABS.findIndex((tab) => tab.id === active);
  if (index < 0) return null;

  const delta = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
  const target =
    key === 'Home'
      ? 0
      : key === 'End'
        ? TABS.length - 1
        : delta === 0
          ? -1 // 우리가 다루는 키가 아니다. 브라우저 기본 동작을 막지 않는다.
          : (index + delta + TABS.length) % TABS.length;

  return TABS[target]?.id ?? null;
}
