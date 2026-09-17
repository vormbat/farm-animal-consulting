import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from './storage';

describe('localStorage 래퍼', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('저장한 값을 그대로 읽는다', () => {
    const store = createStore('weather_location', 1, { name: '' });
    store.write({ name: '전주' });
    expect(store.read()).toEqual({ name: '전주' });
  });

  it('값이 없으면 기본값을 준다', () => {
    expect(createStore('missing', 1, 'fallback').read()).toBe('fallback');
  });

  it('버전이 다르면 예전 값을 버리고 기본값을 쓴다', () => {
    createStore('boards', 1, ['a']).write(['old']);
    expect(createStore('boards', 2, ['a']).read()).toEqual(['a']);
  });

  it('깨진 JSON 이 들어 있어도 예외를 던지지 않는다', () => {
    window.localStorage.setItem('fac:broken', '{{{');
    expect(createStore('broken', 1, 'fallback').read()).toBe('fallback');
  });

  it('형태 검사를 통과하지 못한 값은 기본값으로 되돌린다', () => {
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((x) => typeof x === 'string');
    createStore<unknown>('list', 1, null).write({ not: 'an array' });
    expect(createStore('list', 1, [] as string[], isStringArray).read()).toEqual([]);
  });
});
