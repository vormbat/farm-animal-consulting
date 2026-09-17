import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * 탭 레지스트리 — 이 배열이 라우팅·헤더 탭바·해시 파싱의 단일 출처다.
 *
 * 탭을 추가하려면:
 *   1. `src/features/<id>/index.tsx` 에 기본 내보내기 컴포넌트를 만든다.
 *   2. 아래 배열에 한 줄 추가한다.
 * 그 외에 손댈 곳은 없다.
 *
 * `id` 는 주소 해시(`#price`)와 그대로 이어지는 공개 계약이다.
 * farm-pro가 이 페이지를 iframe으로 띄우면서 해시로 탭을 지정하므로 이름을 바꾸면 안 된다.
 */
export interface TabDef {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly Component: LazyExoticComponent<ComponentType>;
}

export const TABS = [
  {
    id: 'price',
    label: '양계 산지시세',
    icon: '📊',
    Component: lazy(() => import('@/features/price')),
  },
  {
    id: 'weather',
    label: '날씨',
    icon: '🌤️',
    Component: lazy(() => import('@/features/weather')),
  },
  {
    id: 'vent',
    label: '환기가이드',
    icon: '🌬️',
    Component: lazy(() => import('@/features/vent')),
  },
  {
    id: 'consult',
    label: '육계/산란계 컨설팅',
    icon: '🐔🥚',
    Component: lazy(() => import('@/features/consult')),
  },
  {
    id: 'disease',
    label: '양계질병',
    icon: '🩺',
    Component: lazy(() => import('@/features/disease')),
  },
  {
    id: 'hpai',
    label: 'AI 발생예측통계',
    icon: '🦠',
    Component: lazy(() => import('@/features/hpai')),
  },
  {
    id: 'briefing',
    label: '뉴스정보',
    icon: '📋',
    Component: lazy(() => import('@/features/briefing')),
  },
  {
    id: 'premium',
    label: '유료서비스',
    icon: '💼',
    Component: lazy(() => import('@/features/premium')),
  },
] as const satisfies readonly TabDef[];

export type TabId = (typeof TABS)[number]['id'];

export const DEFAULT_TAB: TabId = 'price';

const TAB_IDS: readonly string[] = TABS.map((t) => t.id);

export function isTabId(value: string | null | undefined): value is TabId {
  return typeof value === 'string' && TAB_IDS.includes(value);
}

export function getTab(id: TabId): TabDef {
  // isTabId 로 좁힌 값만 들어오므로 반드시 찾힌다.
  return TABS.find((t) => t.id === id) as TabDef;
}
