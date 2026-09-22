import { Card } from '@/components/Card';
import { authAdapter, currentUser, type AuthAdapter } from '@/lib/auth';
import { PREMIUM_CONTACT } from './contact';
import { LockScreen } from './panels/LockScreen';
import { MenuGrid } from './panels/MenuGrid';
import { useAuthState } from './useAuthState';

/**
 * 유료서비스 탭.
 *
 * 화면은 네 갈래뿐이다: 확인 중 · 로그아웃 · 승인 대기 · 승인됨. 무엇을 보고
 * 그렇게 판단했는지는 `lib/auth.ts` 의 어댑터가 정하고 여기서는 모른다.
 *
 * 지금 꽂힌 어댑터는 아무도 로그인시키지 않으므로 실제로는 '로그아웃' 화면만
 * 열린다. 나머지 세 갈래를 미리 적어 두는 이유는, 인증이 붙는 날 고쳐야 할
 * 곳을 `lib/auth.ts` 한 줄로 묶어 두기 위해서다.
 */

const AD_INQUIRY = `mailto:${PREMIUM_CONTACT.adInquiryEmail}?subject=${encodeURIComponent('[광고문의]')}`;

export function PremiumGate({ adapter }: { adapter: AuthAdapter }) {
  const state = useAuthState(adapter);
  const user = currentUser(state);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2.5 px-1">
        <div>
          <div className="text-xs font-semibold tracking-wider text-[var(--color-ink-muted)]">
            💼 유료서비스
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
            전문 컨설턴트와 함께하는 맞춤형 농장 관리 서비스
          </div>
        </div>
        <a
          href={AD_INQUIRY}
          className="shrink-0 rounded-full bg-black/5 px-3 py-1.5 text-[10.5px] whitespace-nowrap text-[var(--color-ink-muted)]"
        >
          📢 광고문의
        </a>
      </div>

      <Card className="px-4 py-8">
        {state.status === 'checking' ? (
          <p className="text-center text-sm text-[var(--color-ink-muted)]">로그인 상태 확인 중…</p>
        ) : null}

        {state.status === 'signed-out' ? <LockScreen adapter={adapter} /> : null}

        {state.status === 'pending' ? (
          <div className="text-center">
            <div className="text-3xl" aria-hidden>
              ⏳
            </div>
            <h3 className="display mt-2 text-[15px]">승인 대기 중입니다</h3>
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{user?.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              관리자 승인 후 이용하실 수 있습니다.
            </p>
            <SignOutButton adapter={adapter} className="mt-4" />
          </div>
        ) : null}

        {state.status === 'approved' ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2 text-[11px] text-[var(--color-ink-muted)]">
              <span>✅ {user?.label} 승인됨</span>
              <SignOutButton adapter={adapter} />
            </div>
            <MenuGrid variant="member" />
            <p className="mt-3 text-center text-[10.5px] text-[var(--color-ink-muted)]">
              메뉴별 화면은 인증이 연결된 뒤에 붙습니다.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function SignOutButton({ adapter, className }: { adapter: AuthAdapter; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => void adapter.signOut()}
      className={`rounded-lg border border-black/15 bg-white px-4 py-2 text-xs text-[var(--color-ink-muted)] ${className ?? ''}`}
    >
      로그아웃
    </button>
  );
}

export default function PremiumTab() {
  return <PremiumGate adapter={authAdapter} />;
}
