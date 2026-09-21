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
 * 화면 아래에 그대로 띄우는 주의 문구
 */
export type Note = string;
export type Count = number;
/**
 * 원문 사이트의 문서 번호
 */
export type Id = string;
/**
 * 원문 URL 슬러그. 사이트 제목이 바뀌어도 이건 그대로다.
 */
export type Slug = string;
/**
 * 원문 문서
 */
export type Url = string;
export type TitleEn = string;
/**
 * 표제어. 현장 병명이 있으면 그쪽을 쓴다.
 */
export type TitleKo = string;
/**
 * 현장에서 쓰는 다른 이름. 검색에 함께 걸린다(예: 감보로, IBD).
 */
export type Aliases = string[];
/**
 * 영문 원문. 다음 수집에서 번역 재사용 판정에 쓴다.
 */
export type En = string;
/**
 * 한글. 번역에 실패하면 영문이 그대로 들어온다.
 */
export type Ko = string;
/**
 * 이 문단에 붙은 원문 사진. 없으면 null
 */
export type Image = string | null;
export type Paragraphs = Paragraph[];
export type Diseases = Disease[];

/**
 * `data/disease/diseases.json`
 */
export interface DiseaseBook {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  note: Note;
  count: Count;
  diseases: Diseases;
}
export interface Disease {
  id: Id;
  slug: Slug;
  url: Url;
  title_en: TitleEn;
  title_ko: TitleKo;
  aliases: Aliases;
  paragraphs: Paragraphs;
}
/**
 * 본문 한 문단.
 */
export interface Paragraph {
  en: En;
  ko: Ko;
  image?: Image;
}
