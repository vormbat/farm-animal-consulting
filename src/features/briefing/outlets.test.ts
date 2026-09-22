import { describe, expect, it } from 'vitest';
import type { NewsBriefing } from '@/types/data/news';
import { CHANNELS, inChannel, isStale, outletList, type Outlet } from './outlets';

/**
 * 수집 산출물을 화면이 쓰는 목록으로 펴는 자리.
 *
 * 매체가 최상위 항목으로 흩어져 있어 여기서 한 번 배열이 된다. 빠뜨린 매체가
 * 있으면 그 카드가 조용히 사라지므로(오류가 아니라 안 보일 뿐이다) 개수를 센다.
 */

function outlet(id: string, channel: string): Outlet {
  return {
    id,
    name: id,
    icon: '📰',
    color: '#000',
    home: `https://${id}.test`,
    note: '',
    channel,
    items: [],
  };
}

const 산출물 = {
  collected_at: '2026-09-22 12:00 KST',
  source_url: 'https://a.test',
  stale: true,
  stale_fields: ['handon'],
  chuksan: outlet('chuksan', 'livestock'),
  aflnews: outlet('aflnews', 'livestock'),
  handon: outlet('handon', 'livestock'),
  policy: outlet('policy', 'policy'),
  econ: outlet('econ', 'economy'),
  politics: outlet('politics', 'society'),
  society: outlet('society', 'society'),
  world: outlet('world', 'world'),
  overseas: outlet('overseas', 'world'),
} satisfies NewsBriefing;

describe('outletList', () => {
  it('매체를 하나도 빠뜨리지 않는다', () => {
    const ids = outletList(산출물).map((row) => row.id);
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
  });

  it('축산 매체가 먼저 온다 — 이 화면의 주인공이다', () => {
    const [first] = outletList(산출물);
    expect(first?.channel).toBe('livestock');
  });

  it('모든 채널이 탭 목록에 들어 있다', () => {
    const used = new Set(outletList(산출물).map((row) => row.channel));
    const declared = new Set(CHANNELS.map((channel) => channel.id));
    expect([...used].every((id) => declared.has(id))).toBe(true);
  });
});

describe('inChannel', () => {
  const outlets = outletList(산출물);

  it('all 은 전부 보여 준다', () => {
    expect(inChannel(outlets, 'all')).toHaveLength(9);
  });

  it('채널로 거른다', () => {
    expect(inChannel(outlets, 'livestock').map((row) => row.id)).toEqual([
      'chuksan',
      'aflnews',
      'handon',
    ]);
    expect(inChannel(outlets, 'world').map((row) => row.id)).toEqual(['world', 'overseas']);
  });

  it('없는 채널은 빈 목록', () => {
    expect(inChannel(outlets, '없음')).toEqual([]);
  });
});

describe('isStale', () => {
  it('되돌린 매체만 표시한다', () => {
    expect(isStale(산출물, 산출물.handon)).toBe(true);
    expect(isStale(산출물, 산출물.chuksan)).toBe(false);
  });

  it('stale_fields 가 없어도 터지지 않는다', () => {
    const 없음 = { ...산출물, stale_fields: undefined } as unknown as NewsBriefing;
    expect(isStale(없음, 산출물.chuksan)).toBe(false);
  });
});
