import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTabNavigation } from './useTabNavigation';

/**
 * farm-pro 가 이 페이지를 iframe 으로 띄우고 탭을 지정하는 두 통로를 지킨다.
 * 라우터 라이브러리를 바꾸거나 상태 관리를 손볼 때 이 테스트가 계약을 붙잡아 준다.
 */
describe('탭 전환 계약', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('처음 열 때 해시에 적힌 탭으로 시작한다', () => {
    window.location.hash = 'vent';
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.tab).toBe('vent');
  });

  it('해시가 없으면 기본 탭으로 시작한다', () => {
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.tab).toBe('price');
  });

  it('등록되지 않은 해시는 무시하고 기본 탭을 쓴다', () => {
    window.location.hash = '__nope__';
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.tab).toBe('price');
  });

  it('부모가 해시만 바꿔도 탭이 따라간다', async () => {
    const { result } = renderHook(() => useTabNavigation());
    act(() => {
      window.location.hash = 'hpai';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await waitFor(() => expect(result.current.tab).toBe('hpai'));
  });

  it('부모가 postMessage({ pbTab }) 로 보내면 탭이 바뀐다', async () => {
    const { result } = renderHook(() => useTabNavigation());
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { pbTab: 'disease' } }));
    });
    await waitFor(() => expect(result.current.tab).toBe('disease'));
  });

  it('postMessage 로 바뀐 탭도 주소 해시에 반영된다', async () => {
    // 이게 없으면 부모가 같은 해시를 다시 넣어도 hashchange 가 안 나서
    // 탭이 postMessage 로 간 자리에 그대로 남는다.
    window.location.hash = 'price';
    const { result } = renderHook(() => useTabNavigation());
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { pbTab: 'briefing' } }));
    });
    await waitFor(() => expect(result.current.tab).toBe('briefing'));
    expect(window.location.hash).toBe('#briefing');
  });

  it('postMessage 로 들어온 낯선 값은 무시한다', async () => {
    const { result } = renderHook(() => useTabNavigation());
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { pbTab: '__nope__' } }));
      window.dispatchEvent(new MessageEvent('message', { data: 'vent' }));
      window.dispatchEvent(new MessageEvent('message', { data: null }));
    });
    await waitFor(() => expect(result.current.tab).toBe('price'));
  });

  it('탭을 직접 고르면 주소 해시도 같이 바뀐다', () => {
    const { result } = renderHook(() => useTabNavigation());
    act(() => result.current.setTab('briefing'));
    expect(result.current.tab).toBe('briefing');
    // 슬래시 없는 `#briefing` 이어야 한다 — HashRouter 형식(`#/briefing`)이면 계약 위반.
    expect(window.location.hash).toBe('#briefing');
  });
});
