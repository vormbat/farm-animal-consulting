import { formatWon } from '@/lib/format';
import { PREMIUM_CONTACT } from '../contact';

/**
 * 신규 회원가입 안내 — 입금 → 입금 문자 → 계정 수신 → 로그인.
 *
 * 결제 연동이 아니다. 관리자가 입금을 확인하고 계정을 직접 만들어 문자로
 * 보내는 실제 운영 방식을 그대로 적은 안내문이라, 여기에는 입력란이 없다.
 */
export function SignupGuide() {
  const steps = [
    {
      title: '계좌 입금',
      detail: (
        <>
          연회원 <b>{formatWon(PREMIUM_CONTACT.yearlyFeeKrw)}</b> 입금
          <br />
          {PREMIUM_CONTACT.bank} <b>{PREMIUM_CONTACT.account}</b> (예금주:{' '}
          {PREMIUM_CONTACT.accountHolder})
        </>
      ),
    },
    {
      title: '입금 문자 전송',
      detail: (
        <>
          입금자명을 <b>{PREMIUM_CONTACT.depositNoticePhone}</b> 으로 문자 전송
        </>
      ),
    },
    {
      title: '아이디·비밀번호 수신',
      detail: <>입금 확인 후 로그인용 아이디(이메일)·비밀번호를 문자로 받습니다</>,
    },
    {
      title: '로그인',
      detail: <>전달받은 아이디·비밀번호로 이 화면에서 로그인합니다</>,
    },
  ];

  return (
    <section className="mt-6 text-left">
      <h3 className="mb-2.5 text-center text-[11px] font-bold text-[var(--color-ink-muted)]">
        💳 신규 회원가입 안내
      </h3>
      <ol className="grid gap-2.5 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-start gap-2.5 rounded-xl border border-black/8 p-3"
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-header-from)] text-[12px] font-extrabold text-[var(--color-tab-accent)]"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-[var(--color-ink)]">{step.title}</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
                {step.detail}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-[10.5px] text-[var(--color-ink-muted)]">
        입금 확인은 영업일 기준으로 다소 시간이 걸릴 수 있습니다.
      </p>
    </section>
  );
}
