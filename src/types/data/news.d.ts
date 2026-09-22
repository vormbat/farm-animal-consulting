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
export type Id = string;
export type Name = string;
export type Icon = string;
/**
 * 카드 윗줄 색
 */
export type Color = string;
/**
 * '전체 ↗' 링크가 가는 곳
 */
export type Home = string;
/**
 * 카드 제목 밑 한 줄 — 무엇을 모아 온 매체인지
 */
export type Note = string;
/**
 * 채널 탭 묶음. livestock/policy/economy/society/world
 */
export type Channel = string;
/**
 * 기사 제목. 해외 매체는 한글 번역
 */
export type Title = string;
/**
 * 원문 주소. 반드시 매체 도메인으로 바로 간다
 */
export type Url = string;
/**
 * `09.22 10:44` (KST). 피드가 날짜를 안 주면 빈 문자열
 */
export type Date = string;
/**
 * 매체 안에서 출처가 또 갈릴 때만
 */
export type Source = string;
/**
 * 번역 전 원문 제목. 번역이 미심쩍을 때 대조할 수 있게 남긴다.
 */
export type TitleEn = string | null;
/**
 * 분류 꼬리표. 지금은 해외 기사에 붙는 '질병' 하나뿐이다.
 */
export type Tags = string[];
export type Items = NewsItem[];

/**
 * 매체 열 곳의 최신 기사.
 */
export interface NewsBriefing {
  collected_at: CollectedAt;
  source_url: SourceUrl;
  stale?: Stale;
  stale_fields?: StaleFields;
  chuksan: NewsOutlet;
  aflnews: NewsOutlet;
  handon: NewsOutlet;
  dailyvet: NewsOutlet;
  policy: NewsOutlet;
  econ: NewsOutlet;
  politics: NewsOutlet;
  society: NewsOutlet;
  world: NewsOutlet;
  overseas: NewsOutlet;
}
/**
 * 매체 하나와 그 최신 기사.
 */
export interface NewsOutlet {
  id: Id;
  name: Name;
  icon: Icon;
  color: Color;
  home: Home;
  note: Note;
  channel: Channel;
  items: Items;
}
export interface NewsItem {
  title: Title;
  url: Url;
  date: Date;
  source?: Source;
  title_en?: TitleEn;
  tags?: Tags;
}
