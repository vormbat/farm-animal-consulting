/**
 * 이 파일은 `npm run gen:types` 가 만든다. 직접 고치지 않는다.
 *
 * 고칠 곳은 pipeline/schemas/ 의 Pydantic 모델이다.
 * 거기서 바꾼 내용이 JSON Schema 를 거쳐 여기로 내려온다.
 */

/* eslint-disable */

/**
 * 수집 시각. 항상 KST 이고 화면에 그대로 찍힌다. 예: 2026-09-17 11:44 KST
 */
export type CollectedAt = string;
/**
 * 원문 출처. 화면의 '원문 ↗' 링크가 된다.
 */
export type SourceUrl = string;
/**
 * 이번 수집에서 되돌린 항목이 하나라도 있으면 true
 */
export type Stale = boolean;
/**
 * 이전 커밋 값으로 되돌린 항목 이름. 화면은 해당 패널에만 갱신 실패를 표시한다.
 */
export type StaleFields = string[];
/**
 * 게시글 제목. 예: 9월 7일 주간 계란 수급 정보(58차)
 */
export type Title = string;
/**
 * 게시일. 예: 2026-09-15
 */
export type PostedAt = string | null;
/**
 * 게시글 주소
 */
export type PostUrl = string;
/**
 * 첨부 PDF 내려받기 주소
 */
export type PdfUrl = string | null;
/**
 * 예: 제2026-58호
 */
export type Issue = string | null;
/**
 * 대상 기간. 예: 2026. 9. 7. ~ 9. 13.
 */
export type Period = string | null;
/**
 * 생산 동향 절 머리의 한 줄 요약(◆)
 */
export type Headline = string | null;
/**
 * 원문의 절 번호
 */
export type Number = number;
/**
 * 예: 유통 동향
 */
export type Title1 = string;
/**
 * 말한 기관. 원문의 '- (대한양계협회) …' 괄호 안. 요약 머리글(◆)은 없다.
 */
export type Org = string | null;
/**
 * 줄바꿈을 이어 붙인 문단
 */
export type Text = string;
/**
 * 문단 목록. 표뿐인 절은 빈 배열
 */
export type Bullets = ReportBullet[];
/**
 * 절 목록. 원문 번호 순서
 */
export type Sections = ReportSection[];

/**
 * `data/price/egg_report.json`
 */
export interface EggReport {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  title: Title;
  posted_at?: PostedAt;
  post_url: PostUrl;
  pdf_url?: PdfUrl;
  issue?: Issue;
  period?: Period;
  headline?: Headline;
  sections: Sections;
}
export interface ReportSection {
  number: Number;
  title: Title1;
  bullets: Bullets;
}
export interface ReportBullet {
  org?: Org;
  text: Text;
}
