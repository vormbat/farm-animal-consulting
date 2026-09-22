import { useState } from 'react';
import { canSignIn, type AuthAdapter } from '@/lib/auth';
import { MenuGrid } from './MenuGrid';
import { SignupGuide } from './SignupGuide';

interface LockScreenProps {
  adapter: AuthAdapter;
}

/**
 * 로그아웃 상태에서 보는 화면.
 *
 * 잠겨 있다는 사실만 알리고 끝내지 않는다 — 원본처럼 가입 절차와 메뉴
 * 미리보기를 함께 보여 준다. 이 탭을 처음 여는 사람에게는 이 화면이 곧
 * 서비스 소개다.
 */
export function LockScreen({ adapter }: LockScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyMethod, setBusyMethod] = useState<string | null>(null);

  async function signIn(methodId: string) {
    setError(null);
    setBusyMethod(methodId);
    try {
      await adapter.signIn(methodId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인에 실패했습니다');
    } finally {
      setBusyMethod(null);
    }
  }

  return (
    <div className="text-center">
      <div className="text-3xl" aria-hidden>
        🔒
      </div>
      <h3 className="display mt-2 text-[15px]">승인된 회원만 이용할 수 있습니다</h3>

      {canSignIn(adapter) ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            로그인한 뒤에도 관리자 승인 전까지는 상담·진단·컨설팅 내용을 볼 수 없습니다.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {adapter.methods.map((method) => (
              <button
                key={method.id}
                type="button"
                disabled={busyMethod !== null}
                onClick={() => void signIn(method.id)}
                className="rounded-[10px] border border-black/15 bg-white px-6 py-3 text-[13px] font-semibold disabled:opacity-50"
              >
                {method.icon} {method.label}
              </button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-[11.5px] text-[var(--color-col-today)]">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        /* 어댑터가 로그인 수단을 하나도 내놓지 않는 상태 — 지금이 그렇다.
           누를 수 없는 로그인 버튼을 그려 두지 않는다. */
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          로그인 기능은 준비 중입니다. 아래 안내대로 가입 신청을 하시면
          <br />
          관리자가 계정을 만들어 문자로 보내 드립니다.
        </p>
      )}

      <SignupGuide />

      <section className="mt-6 text-left">
        <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2">
          <h3 className="text-[11px] font-bold text-[var(--color-ink-muted)]">
            가입하면 이런 메뉴를 이용할 수 있어요
          </h3>
          <span className="rounded-full bg-[color-mix(in_srgb,var(--color-brand-chicken)_12%,white)] px-2.5 py-[3px] text-[9.5px] font-bold whitespace-nowrap text-[var(--color-brand-chicken)]">
            🆕 새로운 메뉴가 계속 업데이트됩니다
          </span>
        </div>
        <MenuGrid variant="preview" />
      </section>
    </div>
  );
}
