import { describe, expect, it } from 'vitest';
import type { DiseaseBook } from '@/types/data/disease';
import { buildIndex, excerpt, search } from './search';

function disease(
  slug: string,
  titleKo: string,
  aliases: string[],
  paragraphs: string[],
): DiseaseBook['diseases'][number] {
  return {
    id: slug,
    slug,
    url: `https://example.test/${slug}`,
    title_en: slug.toUpperCase(),
    title_ko: titleKo,
    aliases,
    paragraphs: paragraphs.map((ko) => ({ en: ko, ko, image: null })),
  };
}

const BOOK: DiseaseBook = {
  collected_at: '2026-09-22 09:00 KST',
  source_url: 'https://example.test',
  note: '',
  count: 3,
  diseases: [
    disease(
      'coccidiosis',
      '콕시듐증',
      ['콕시디아', '구포자충증'],
      ['장 점막이 손상되어 혈변이 나온다. 깔짚이 젖으면 오시스트가 살아남는다.'],
    ),
    disease(
      'newcastle-disease',
      '뉴캐슬병',
      ['ND'],
      ['신경증상과 녹변이 나타나며 산란율이 급격히 떨어진다.'],
    ),
    disease('gout', '통풍', [], ['요산이 관절과 내장에 쌓인다.']),
  ],
};

const INDEX = buildIndex(BOOK);

describe('색인', () => {
  it('제목·별칭·본문을 모두 담는다', () => {
    const entry = INDEX[0]!;
    expect(entry.haystack).toContain('콕시듐증');
    expect(entry.haystack).toContain('구포자충증');
    expect(entry.haystack).toContain('혈변');
    // 제목 칸에는 본문이 들어가지 않는다 — 정렬 기준이 흐려진다.
    expect(entry.titles).not.toContain('혈변');
  });
});

describe('검색', () => {
  it('병명으로 찾는다', () => {
    expect(search(INDEX, '콕시듐').map((hit) => hit.disease.slug)).toEqual(['coccidiosis']);
  });

  it('현장에서 쓰는 다른 이름으로도 찾는다', () => {
    expect(search(INDEX, '구포자충증').map((hit) => hit.disease.slug)).toEqual(['coccidiosis']);
    expect(search(INDEX, 'ND').map((hit) => hit.disease.slug)).toEqual(['newcastle-disease']);
  });

  it('증상 본문으로도 찾는다', () => {
    // 농가가 들고 오는 것은 병명이 아니라 증상이다.
    expect(search(INDEX, '녹변').map((hit) => hit.disease.slug)).toEqual(['newcastle-disease']);
  });

  it('낱말을 모두 포함해야 걸린다', () => {
    // 하나라도 걸리면 통과시키면 '닭 설사' 가 닭이 나오는 전부를 끌고 온다.
    expect(search(INDEX, '혈변 깔짚')).toHaveLength(1);
    expect(search(INDEX, '혈변 요산')).toHaveLength(0);
  });

  it('제목에서 걸린 것을 본문에서만 걸린 것보다 위에 둔다', () => {
    const hits = search(INDEX, '통풍');
    expect(hits[0]!.disease.slug).toBe('gout');
    expect(hits[0]!.inTitle).toBe(true);
  });

  it('대소문자를 가리지 않는다', () => {
    expect(search(INDEX, 'nd')).toHaveLength(1);
  });

  it('빈 검색어는 아무것도 내지 않는다', () => {
    expect(search(INDEX, '   ')).toEqual([]);
  });
});

describe('발췌', () => {
  it('검색어가 걸린 대목을 잘라 준다', () => {
    const text = excerpt(BOOK.diseases[0]!, '오시스트', 40);
    expect(text).toContain('오시스트');
  });

  it('본문에 없는 말이면 앞부터 자른다', () => {
    const text = excerpt(BOOK.diseases[2]!, '콕시듐', 40);
    expect(text.startsWith('요산이')).toBe(true);
  });
});
