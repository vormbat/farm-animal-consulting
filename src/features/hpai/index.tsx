import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '최근 180일 WOAH 신고 요약',
  '국내 현황 (가금 · 야생조류 · 진행중 건수)',
  '동아시아-대양주 철새경로(EAAF) 국가별 표',
  '대륙별 신고 현황',
] as const;

export default function HpaiTab() {
  return <TabPlaceholder icon="🦠" title="AI 발생예측통계" phase="P4" panels={PANELS} />;
}
