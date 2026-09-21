import { LayerPricePanel } from './panels/LayerPricePanel';
import { PulletPricePanel } from './panels/PulletPricePanel';
import { PoultryStatsPanel } from './panels/PoultryStatsPanel';
import { BroilerTodayPanel } from './panels/BroilerTodayPanel';
import { EggReportPanel } from './panels/EggReportPanel';

export default function PriceTab() {
  return (
    <div className="space-y-4">
      <LayerPricePanel />
      <PulletPricePanel />
      <BroilerTodayPanel />
      <PoultryStatsPanel />
      <EggReportPanel />
    </div>
  );
}
