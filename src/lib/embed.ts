/**
 * iframe 임베드 계약.
 *
 * 이 사이트는 farm-pro 의 "가금컨설팅" 메뉴 안에 iframe 으로 들어간다.
 * 부모 화면이 탭을 지정하는 통로가 두 개 있고, 둘 다 원본에서 그대로 계승한다.
 *
 *   1. `src` 의 해시  — `...#vent` 로 바꾸면 페이지를 다시 읽지 않고 탭만 바뀐다.
 *   2. `postMessage({ pbTab: 'vent' })`
 *
 * 임베드 상태에서는 제목 줄을 숨기고 탭바만 남긴다(부모에 이미 제목이 있다).
 */
export function isEmbedded(): boolean {
  try {
    // 다른 출처 페이지에 끼워져 있어도 참조 비교 자체는 막히지 않는다.
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** 부모가 보내는 탭 전환 메시지의 형태. */
export interface ParentTabMessage {
  pbTab: string;
}

export function readParentTabMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const tab = (data as Partial<ParentTabMessage>).pbTab;
  return typeof tab === 'string' ? tab : null;
}
