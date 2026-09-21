import { useSyncExternalStore } from 'react';
import { createStore } from './storage';

/**
 * 사용자가 고른 농장 위치.
 *
 * 날씨 탭에서 고르지만 환기가이드 탭도 같은 위치를 본다(바깥 기온·습도가
 * 환기 권고의 입력이다). 그래서 탭 컴포넌트가 아니라 여기에 둔다.
 *
 * 상태 라이브러리를 들이지 않은 이유는 공유할 상태가 이것 하나이기 때문이다.
 * `useSyncExternalStore` 는 리액트가 이런 경우를 위해 내준 물건이다.
 */

export interface FarmLocation {
  name: string;
  lat: number;
  lng: number;
}

function isLocation(value: unknown): value is FarmLocation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lat) &&
    Number.isFinite(candidate.lng)
  );
}

const store = createStore<FarmLocation | null>(
  'weather-location',
  1,
  null,
  (value): value is FarmLocation | null => value === null || isLocation(value),
);

let current: FarmLocation | null = store.read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): FarmLocation | null {
  return current;
}

export function setLocation(next: FarmLocation): void {
  // 같은 곳을 다시 고르면 구독자를 깨우지 않는다.
  if (current && current.lat === next.lat && current.lng === next.lng) return;
  current = next;
  store.write(next);
  for (const listener of listeners) listener();
}

export function clearLocation(): void {
  if (current === null) return;
  current = null;
  store.clear();
  for (const listener of listeners) listener();
}

/** 지금 선택된 위치. 아직 고르지 않았으면 null. */
export function useFarmLocation(): FarmLocation | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
