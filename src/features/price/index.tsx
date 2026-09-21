import { TabPlaceholder } from '@/components/TabPlaceholder';
import { LayerPricePanel } from './panels/LayerPricePanel';
import { PulletPricePanel } from './panels/PulletPricePanel';
import { BroilerTodayPanel } from './panels/BroilerTodayPanel';
import { EggReportPanel } from './panels/EggReportPanel';

/** 아직 만들지 않은 패널. 구현 순서를 화면에서도 확인할 수 있게 남겨 둔다. */
const REMAINING = ['산란계·육계 사육 통계 (전국 요약 + 시도별)'] as const;

export default function PriceTab() {
  return (
    <div className="space-y-4">
      <LayerPricePanel />
      <PulletPricePanel />
      <BroilerTodayPanel />
      <EggReportPanel />
      <TabPlaceholder icon="📊" title="양계 산지시세" phase="P2" panels={REMAINING} />
    </div>
  );
}
