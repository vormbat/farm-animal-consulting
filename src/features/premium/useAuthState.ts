import { useCallback, useSyncExternalStore } from 'react';
import { authAdapter, type AuthAdapter, type AuthState } from '@/lib/auth';

/**
 * 어댑터의 상태를 구독한다.
 *
 * 인자를 받는 이유는 테스트 때문이다 — 지금 꽂힌 구현(`nullAuthAdapter`)은
 * 영원히 로그아웃 상태라, 승인·대기 화면은 가짜 어댑터로만 열어 볼 수 있다.
 */
export function useAuthState(adapter: AuthAdapter = authAdapter): AuthState {
  const subscribe = useCallback((listener: () => void) => adapter.subscribe(listener), [adapter]);
  const snapshot = useCallback(() => adapter.getState(), [adapter]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
