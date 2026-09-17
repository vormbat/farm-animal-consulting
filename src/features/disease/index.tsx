import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '오늘의 사양관리 포인트 (날씨 연동)',
  '이달의 질병 — 월별 지목 이력 및 누적 통계',
  '양계질병 사전 54종 검색 (병명 · 이명 · 증상 본문)',
] as const;

export default function DiseaseTab() {
  return <TabPlaceholder icon="🩺" title="양계질병" phase="P4" panels={PANELS} />;
}
