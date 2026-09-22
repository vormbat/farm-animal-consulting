import { describe, expect, it, vi } from 'vitest';
import {
  AuthUnavailableError,
  canSignIn,
  currentUser,
  isApproved,
  nullAuthAdapter,
  type AuthState,
} from './auth';

const USER = { id: 'u1', label: 'farmer@example.com' };

describe('nullAuthAdapter', () => {
  it('언제나 로그아웃 상태다', () => {
    expect(nullAuthAdapter.getState()).toEqual({ status: 'signed-out' });
  });

  it('같은 상태 객체를 돌려준다', () => {
    // useSyncExternalStore 가 이 동일성으로 다시 그릴지 정한다.
    // 매번 새 객체를 만들면 무한 렌더가 된다.
    expect(nullAuthAdapter.getState()).toBe(nullAuthAdapter.getState());
  });

  it('구독은 아무 일도 하지 않고, 해지해도 터지지 않는다', () => {
    const listener = vi.fn();
    const unsubscribe = nullAuthAdapter.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it('로그인 수단이 없다', () => {
    expect(canSignIn(nullAuthAdapter)).toBe(false);
  });

  it('로그인을 시도하면 이유를 담아 거절한다', async () => {
    await expect(nullAuthAdapter.signIn('google')).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('로그아웃은 이미 로그아웃이므로 그냥 끝난다', async () => {
    await expect(nullAuthAdapter.signOut()).resolves.toBeUndefined();
  });
});

describe('상태 읽기', () => {
  const cases: Array<[AuthState, boolean, string | null]> = [
    [{ status: 'checking' }, false, null],
    [{ status: 'signed-out' }, false, null],
    [{ status: 'pending', user: USER }, false, USER.label],
    [{ status: 'approved', user: USER }, true, USER.label],
  ];

  it.each(cases)('%o → 승인 %s, 사용자 %s', (state, approved, label) => {
    expect(isApproved(state)).toBe(approved);
    expect(currentUser(state)?.label ?? null).toBe(label);
  });
});
