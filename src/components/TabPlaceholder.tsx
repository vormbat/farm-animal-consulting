import { Card, CardTitle } from './Card';

interface TabPlaceholderProps {
  icon: string;
  title: string;
  /** 이 탭이 최종적으로 담을 패널 목록. 구현 순서를 화면에서도 확인할 수 있게 적어둔다. */
  panels: readonly string[];
  phase: string;
}

export function TabPlaceholder({ icon, title, panels, phase }: TabPlaceholderProps) {
  return (
    <Card>
      <CardTitle icon={icon} note={`${phase} 구현 예정`}>
        {title}
      </CardTitle>
      <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-ink-muted)]">
        {panels.map((panel) => (
          <li key={panel} className="flex gap-2">
            <span aria-hidden>·</span>
            <span>{panel}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
