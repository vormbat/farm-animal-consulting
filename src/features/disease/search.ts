import type { Disease, DiseaseBook } from '@/types/data/disease';

/**
 * 질병 사전 검색.
 *
 * 병명만 찾으면 현장에서 못 쓴다. 농가가 들고 오는 것은 병명이 아니라 증상이라
 * **본문까지 함께 훑는다**("녹변", "개구호흡" 으로 찾아야 한다).
 *
 * 색인은 화면에서 한 번 만든다. 수집 산출물에 검색 문자열을 넣어 두면 한글
 * 본문을 통째로 복제하는 셈이라 파일이 두 배가 된다 — 54종이면 만드는 비용이
 * 무시할 만하다.
 */

export interface Indexed {
  disease: Disease;
  /** 소문자로 눌러 둔 검색 대상 — 제목·별칭·본문 */
  haystack: string;
  /** 제목·별칭만. 제목 일치를 본문 일치보다 위로 올리는 데 쓴다. */
  titles: string;
}

export function buildIndex(book: DiseaseBook): Indexed[] {
  return book.diseases.map((disease) => {
    const titles = [disease.title_ko, disease.title_en, ...disease.aliases].join(' ');
    const body = disease.paragraphs.map((paragraph) => paragraph.ko).join(' ');
    return {
      disease,
      titles: titles.toLowerCase(),
      haystack: `${titles} ${body}`.toLowerCase(),
    };
  });
}

export interface Hit {
  disease: Disease;
  /** 제목·별칭에서 걸렸는지. 본문에서만 걸린 것보다 위에 둔다. */
  inTitle: boolean;
}

/**
 * 공백으로 나눈 낱말을 **모두** 포함해야 걸린다.
 *
 * 하나라도 걸리면 통과시키면 "닭 설사" 가 닭이 나오는 모든 질병을 끌고 온다.
 * 좁게 잡고 사용자가 낱말을 줄이게 하는 편이 낫다.
 */
export function search(index: Indexed[], query: string): Hit[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const hits: Hit[] = [];
  for (const entry of index) {
    if (!words.every((word) => entry.haystack.includes(word))) continue;
    hits.push({
      disease: entry.disease,
      inTitle: words.every((word) => entry.titles.includes(word)),
    });
  }

  hits.sort((a, b) => {
    if (a.inTitle !== b.inTitle) return a.inTitle ? -1 : 1;
    return a.disease.title_ko.localeCompare(b.disease.title_ko, 'ko');
  });
  return hits;
}

/** 검색어가 걸린 대목을 앞뒤로 잘라 보여 준다. 없으면 첫 문단. */
export function excerpt(disease: Disease, query: string, length = 110): string {
  const body = disease.paragraphs.map((paragraph) => paragraph.ko).join(' ');
  const word = query.trim().toLowerCase().split(/\s+/).filter(Boolean)[0];

  if (word) {
    const at = body.toLowerCase().indexOf(word);
    if (at >= 0) {
      const from = Math.max(0, at - Math.floor(length / 3));
      return (from > 0 ? '… ' : '') + body.slice(from, from + length).trim() + '…';
    }
  }
  return body.slice(0, length).trim() + (body.length > length ? '…' : '');
}
