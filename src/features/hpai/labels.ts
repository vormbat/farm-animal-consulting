import type { Level } from '@/types/data/hpai';

/**
 * 화면 표기.
 *
 * WAHIS 는 지역 이름을 영문으로 주고 단계는 코드로 준다. 우리말로 바꾸는 일은
 * 표시 단계에서만 하고 수집 산출물은 원문 값을 그대로 담는다 — 나중에 다른
 * 화면이 같은 데이터를 다르게 부르더라도 원본을 다시 볼 수 있어야 한다.
 */

export const LEVELS: Record<Level, { label: string; color: string; bg: string }> = {
  ongoing: { label: '진행중', color: '#B71C1C', bg: '#FFEBEE' },
  recent: { label: '최근신고', color: '#E65100', bg: '#FFF3E0' },
  quiet: { label: '소강', color: '#2E7D32', bg: '#E8F5E9' },
};

const REGION_KO: Record<string, string> = {
  Europe: '유럽',
  Americas: '아메리카',
  Asia: '아시아',
  Africa: '아프리카',
  Oceania: '오세아니아',
};

/** 모르는 지역 이름은 원문 그대로 둔다. 지어내는 것보다 낫다. */
export function regionName(name: string): string {
  return REGION_KO[name] ?? name;
}

export const POULTRY_COLOR = '#E8530A';
export const WILD_COLOR = '#5E9BD1';
