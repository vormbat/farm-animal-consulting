import { TABS, type TabId } from '@/lib/tabs';
import { nextTab } from './tab-keys';
import { cn } from '@/lib/utils';

interface TabBarProps {
  active: TabId;
  onSelect: (id: TabId) => void;
}

/**
 * 탭 8개가 900px 안에 한 줄로 들어가되, 좁은 화면에서는 줄바꿈 대신
 * 옆으로 스크롤된다(원본과 동일). 줄바꿈을 허용하면 헤더 높이가
 * 화면마다 달라져 iframe 높이 계산이 틀어진다.
 */
export function TabBar({ active, onSelect }: TabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="화면 전환"
      className="flex scrollbar-none gap-0.5 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => {
              const next = nextTab(event.key, active);
              if (!next) return;
              event.preventDefault();
              onSelect(next);
              document.getElementById(`tab-${next}`)?.focus();
            }}
            className={cn(
              'shrink-0 rounded-t-lg border-b-[3px] border-transparent px-2.5 py-2 text-xs whitespace-nowrap text-white transition-colors',
              'hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--color-tab-accent)] focus-visible:outline-none',
              isActive && 'border-b-[var(--color-tab-accent)] bg-white/15 font-bold',
            )}
          >
            <span aria-hidden>{tab.icon}</span> {tab.label}
          </button>
        );
      })}
    </div>
  );
}
