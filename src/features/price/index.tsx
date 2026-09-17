import { TabPlaceholder } from '@/components/TabPlaceholder';
import { LayerPricePanel } from './panels/LayerPricePanel';
import { BroilerTodayPanel } from './panels/BroilerTodayPanel';

/** 아직 만들지 않은 패널. 구현 순서를 화면에서도 확인할 수 있게 남겨 둔다. */
const REMAINING = [
  '산란계 중추 시세 (협회 게시 이미지 OCR)',
  '산란계·육계 사육 통계 (전국 요약 + 시도별)',
  '주간 계란 수급 정보 브리핑',
] as const;

export default function PriceTab() {
  return (
    <div className="space-y-4">
      <LayerPricePanel />
      <BroilerTodayPanel />
      <TabPlaceholder icon="📊" title="양계 산지시세" phase="P2" panels={REMAINING} />
    </div>
  );
}
