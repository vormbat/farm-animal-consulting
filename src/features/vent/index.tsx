import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '축종 선택 (육계 · 산란계 · 양돈)',
  '계사 구조 선택 (무창 · 유창)',
  '사육단계별 3단계 환기 기준 (Aviagen · PIC)',
  'Munters 습도 이중제어 판정 — 날씨 탭 위치 정보를 사용',
] as const;

export default function VentTab() {
  return <TabPlaceholder icon="🌬️" title="환기가이드" phase="P3" panels={PANELS} />;
}
