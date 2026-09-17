import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '매체별 최신 기사 (축산신문 · 농수축산신문 · 한돈뉴스 · 데일리벳 등)',
  '채널별 뉴스 (축산·농업 / 경제 / 정치·사회 / 국제)',
  '협회 게시판 바로가기 (사용자 추가 항목은 브라우저에 저장)',
] as const;

export default function BriefingTab() {
  return <TabPlaceholder icon="📋" title="뉴스정보" phase="P5" panels={PANELS} />;
}
