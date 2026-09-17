import { TabPlaceholder } from '@/components/TabPlaceholder';

const PANELS = [
  '승인 회원 전용 잠금 화면',
  '약품조회 및 휴약기간 검색 · 상담 · 진단 · 컨설팅',
  '인증은 AuthAdapter 인터페이스 뒤에 두고 실제 연동은 다음 단계',
] as const;

export default function PremiumTab() {
  return <TabPlaceholder icon="💼" title="유료서비스" phase="P6" panels={PANELS} />;
}
