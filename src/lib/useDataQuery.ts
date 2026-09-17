import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dataClient } from './data-client';
import type { DataMap, DataPath } from '@/types/data';

/**
 * 수집 산출물 하나를 읽는 표준 훅.
 *
 * 패널마다 fetch·로딩·오류·캐시를 따로 짜지 않게 한 곳에 모았다.
 * 새 패널은 `useDataQuery('price/broiler_today.json')` 처럼 경로만 주면 되고,
 * 반환 타입은 수집 스키마에서 생성된 대응표가 정한다.
 *
 * `refresh()` 는 갱신 버튼용이다. 평소 요청은 분 단위 캐시 키를 쓰지만
 * 사용자가 직접 누른 갱신은 캐시를 무시하고 새로 받는다.
 */
export function useDataQuery<K extends DataPath>(path: K) {
  const queryClient = useQueryClient();
  const queryKey = ['data', path] as const;

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }): Promise<DataMap[K]> => dataClient.get(path, { signal }),
  });

  const refresh = useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey,
        queryFn: ({ signal }): Promise<DataMap[K]> =>
          dataClient.get(path, { signal, bustCache: true }),
        staleTime: 0,
      }),
    // queryKey 는 path 에서만 파생되므로 path 만 보면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, path],
  );

  return { ...query, refresh };
}
