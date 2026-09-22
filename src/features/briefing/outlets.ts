import type { NewsBriefing } from '@/types/data/news';

/**
 * 매체 카드의 순서와 채널 묶음.
 *
 * 수집 산출물은 매체마다 최상위 항목을 따로 둔다(되돌리기가 항목 단위로 돌기
 * 때문이다 — `pipeline/schemas/news.py` 참고). 그래서 배열로 펴는 자리가 한 번
 * 필요하고, 그게 여기다. 화면 쪽은 이 뒤로는 목록만 다룬다.
 *
 * 매체를 늘리려면 여기 한 줄. 스키마 항목과 어긋나면 타입 검사가 잡는다.
 */

export type Outlet = NewsBriefing['chuksan'];

/**
 * 매체를 고정된 순서로 편다. 축산이 먼저, 일반 뉴스가 나중이다.
 *
 * **없는 매체는 건너뛴다.** 타입은 다 있다고 말하지만 실제로는 없을 수 있다 —
 * 이 사이트는 앱과 데이터를 따로 배포하기 때문이다(데이터가 바뀔 때마다
 * 재빌드하지 않으려고 일부러 그렇게 했다). 매체를 더하거나 빼면 그 사이 얼마
 * 동안은 사용자가 옛 번들로 새 JSON 을 읽거나 그 반대가 된다.
 *
 * 처음에는 그냥 늘어놓았는데, 데일리벳을 뺐더니 캐시된 번들을 든 브라우저에서
 * `data.dailyvet` 이 undefined 가 되어 뉴스 탭 전체가 오류 화면이 됐다. 매체
 * 하나 때문에 탭을 통째로 잃는 건 부분 실패가 정상 데이터를 지우지 않는다는
 * 이 프로젝트의 규약과도 어긋난다.
 */
export function outletList(data: NewsBriefing): Outlet[] {
  const ordered = [
    data.chuksan,
    data.aflnews,
    data.handon,
    data.policy,
    data.econ,
    data.politics,
    data.society,
    data.world,
    data.overseas,
  ];
  return ordered.filter((outlet): outlet is Outlet => Boolean(outlet?.id));
}

export interface Channel {
  id: string;
  label: string;
}

/**
 * 채널 탭. `all` 은 목록에 없고 화면이 맨 앞에 따로 붙인다.
 *
 * 원본에도 채널 탭이 있었지만 어느 탭에서도 열리지 않는 코드였다(`state.tab`
 * 이 "news" 가 되는 경로가 없다). 여기서는 실제로 쓴다 — 매체가 열 곳이라
 * 한 화면에 다 펴면 정작 축산 기사가 묻히기 때문이다.
 */
export const CHANNELS: readonly Channel[] = [
  { id: 'livestock', label: '축산·농업' },
  { id: 'policy', label: '정책' },
  { id: 'economy', label: '경제' },
  { id: 'society', label: '정치·사회' },
  { id: 'world', label: '국제' },
];

export function inChannel(outlets: Outlet[], channel: string): Outlet[] {
  return channel === 'all' ? outlets : outlets.filter((outlet) => outlet.channel === channel);
}

/** 이 매체가 이번 수집에서 갱신되지 못했는지. */
export function isStale(data: NewsBriefing, outlet: Outlet): boolean {
  return data.stale_fields?.includes(outlet.id) ?? false;
}
