import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '산란계 관련시세 카드 (계란 산지가격 · 병아리 · 산란노계 · 중추)',
  '금일 육계시세 표 (대한양계협회)',
  '산란계·육계 사육 통계 (전국 요약 + 시도별)',
  '주간 계란 수급 정보 브리핑',
] as const;

export default function PriceTab() {
  return <TabPlaceholder icon="📊" title="양계 산지시세" phase="P1–P2" panels={PANELS} />;
}
