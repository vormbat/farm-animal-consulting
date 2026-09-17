import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '품종 선택 (Ross 308 · Cobb 500 · Arbor Acres Plus · 산란계 품종)',
  '일령별 목표체중 · FCR · 일당증체 · 사료섭취 요약',
  '일령별 음수량·사료섭취량 표 (선택 일령 강조)',
] as const;

export default function ConsultTab() {
  return <TabPlaceholder icon="🐔🥚" title="육계/산란계 컨설팅" phase="P3" panels={PANELS} />;
}
