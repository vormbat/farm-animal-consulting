import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PREMIUM_ITEMS } from '@/data/premium-menu';
import {
  AuthUnavailableError,
  nullAuthAdapter,
  type AuthAdapter,
  type AuthState,
} from '@/lib/auth';
import { PremiumGate } from './index';

/**
 * 잠금 화면 말고 나머지 세 갈래는 지금 꽂힌 어댑터로는 열 수 없다
 * (`nullAuthAdapter` 는 영원히 로그아웃이다). 가짜 어댑터로 열어 둔다 —
 * 인증이 붙는 날 이 화면들이 처음 눈에 띄면 그때 고치게 된다.
 */
function fake(state: AuthState, overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    id: 'fake',
    methods: [],
    getState: () => state,
    subscribe: () => () => {},
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    ...overrides,
  };
}

const USER = { id: 'u1', label: 'farmer@example.com' };

describe('유료서비스 잠금 화면', () => {
  it('로그인 수단이 없으면 누를 수 없는 버튼을 그리지 않는다', () => {
    render(<PremiumGate adapter={nullAuthAdapter} />);

    expect(screen.getByText('승인된 회원만 이용할 수 있습니다')).toBeInTheDocument();
    expect(screen.getByText(/로그인 기능은 준비 중입니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /로그인/ })).not.toBeInTheDocument();
  });

  it('가입 안내와 메뉴 미리보기를 함께 보여 준다', () => {
    render(<PremiumGate adapter={nullAuthAdapter} />);

    expect(screen.getByText('💳 신규 회원가입 안내')).toBeInTheDocument();
    expect(screen.getByText('200,000원')).toBeInTheDocument();
    for (const item of PREMIUM_ITEMS) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('로그인 수단이 있으면 버튼으로 그리고 눌렀을 때 어댑터를 부른다', async () => {
    const signIn = vi.fn(() => Promise.resolve());
    const adapter = fake(
      { status: 'signed-out' },
      { methods: [{ id: 'google', label: 'Google로 로그인', icon: '🔵' }], signIn },
    );
    render(<PremiumGate adapter={adapter} />);

    fireEvent.click(screen.getByRole('button', { name: /Google로 로그인/ }));
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('google');
    });
  });

  it('로그인이 실패하면 이유를 화면에 남긴다', async () => {
    const adapter = fake(
      { status: 'signed-out' },
      {
        methods: [{ id: 'google', label: 'Google로 로그인', icon: '🔵' }],
        signIn: () => Promise.reject(new AuthUnavailableError('잠시 후 다시 시도해 주세요')),
      },
    );
    render(<PremiumGate adapter={adapter} />);

    fireEvent.click(screen.getByRole('button', { name: /Google로 로그인/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요');
  });
});

describe('유료서비스 나머지 상태', () => {
  it('확인 중에는 기다리라고만 한다', () => {
    render(<PremiumGate adapter={fake({ status: 'checking' })} />);

    expect(screen.getByText('로그인 상태 확인 중…')).toBeInTheDocument();
    expect(screen.queryByText('승인된 회원만 이용할 수 있습니다')).not.toBeInTheDocument();
  });

  it('승인 대기 중이면 메뉴를 보여 주지 않는다', () => {
    const signOut = vi.fn(() => Promise.resolve());
    render(<PremiumGate adapter={fake({ status: 'pending', user: USER }, { signOut })} />);

    expect(screen.getByText('승인 대기 중입니다')).toBeInTheDocument();
    expect(screen.getByText(USER.label)).toBeInTheDocument();
    expect(screen.queryByText('약품조회 및 휴약기간 검색')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(signOut).toHaveBeenCalled();
  });

  it('승인되면 메뉴 목록을 보여 준다', () => {
    render(<PremiumGate adapter={fake({ status: 'approved', user: USER })} />);

    expect(screen.getByText(`✅ ${USER.label} 승인됨`)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(PREMIUM_ITEMS.length);
    expect(screen.queryByText('💳 신규 회원가입 안내')).not.toBeInTheDocument();
  });
});
