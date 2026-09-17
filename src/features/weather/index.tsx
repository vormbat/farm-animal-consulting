import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '오늘의 절기 (황경 기준 자동 계산) 및 절기별 가축사육 가이드',
  '주간 날씨 예보 + 작년 동기 비교 (Open-Meteo)',
  'GPS 위치 감지 · 지역 검색 (위치는 브라우저에 저장)',
] as const;

export default function WeatherTab() {
  return <TabPlaceholder icon="🌤️" title="날씨" phase="P3" panels={PANELS} />;
}
