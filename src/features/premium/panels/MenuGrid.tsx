import { PREMIUM_ITEMS } from '@/data/premium-menu';

interface MenuGridProps {
  /**
   * `preview` 는 잠금 화면의 "가입하면 이런 메뉴를 쓸 수 있어요",
   * `member` 는 승인 회원이 보는 목록이다. 지금은 둘 다 누를 수 없다 —
   * 메뉴 화면 자체가 아직 없다.
   */
  variant: 'preview' | 'member';
}

/**
 * 유료서비스 메뉴 카드.
 *
 * 원본도 같은 배열 하나를 잠금 화면 미리보기와 회원 메뉴에 함께 썼다.
 * 메뉴가 늘어날 때 두 화면이 어긋나지 않는 유일한 방법이라 그대로 따른다.
 */
export function MenuGrid({ variant }: MenuGridProps) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {PREMIUM_ITEMS.map((item) => (
        <li
          key={item.key}
          className="rounded-xl border border-t-4 border-black/8 bg-white p-3.5 text-left"
          style={{ borderTopColor: item.color }}
        >
          <div className="text-[22px] leading-none" aria-hidden>
            {item.icon}
          </div>
          <h4 className="mt-1.5 text-[12.5px] font-bold text-[var(--color-ink)]">{item.title}</h4>
          <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--color-ink-muted)]">
            {item.desc}
          </p>
          {variant === 'member' ? (
            <p className="mt-2 text-[10px] font-bold text-[var(--color-ink-muted)]">준비 중</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
