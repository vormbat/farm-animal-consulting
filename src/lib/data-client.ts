/**
 * 데이터 접근 어댑터.
 *
 * 화면 컴포넌트는 이 인터페이스만 알고 URL 은 모른다.
 * 지금은 수집 파이프라인이 저장소에 커밋한 JSON 을 raw.githubusercontent.com 에서
 * 그대로 읽지만(원본과 동일한 운영 방식), 나중에 백엔드가 생기면
 * `createApiClient` 를 만들어 이 파일에서 한 줄만 바꿔 끼운다.
 *
 * 원본이 브라우저에서 공개 CORS 프록시(codetabs/allorigins/…)를 로테이션하던 부분은
 * 여기로 옮겨오지 않는다. 외부 사이트 수집은 전부 GitHub Actions 쪽에서 끝내고,
 * 브라우저는 우리 JSON 만 읽는다.
 */

/** 저장소 `data/` 기준 상대 경로. P1에서 생성 타입으로 좁힌다. */
export type DataPath = string;

export interface FetchOptions {
  signal?: AbortSignal;
  /** 갱신 버튼처럼 캐시를 무시해야 할 때만 true. */
  bustCache?: boolean;
  timeoutMs?: number;
}

export interface DataClient {
  get<T>(path: DataPath, options?: FetchOptions): Promise<T>;
  /** 화면에 "원문 보기" 링크를 걸 때 쓴다. */
  urlFor(path: DataPath): string;
}

export class DataFetchError extends Error {
  constructor(
    message: string,
    readonly path: DataPath,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'DataFetchError';
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** 분 단위로 잘라 쓰는 캐시 키. raw 응답 캐시(수 분)와 갱신 주기 사이 절충. */
function minuteStamp(): string {
  return String(Math.floor(Date.now() / 60_000));
}

export interface RawGithubClientConfig {
  /** `owner/repo` */
  repo: string;
  branch: string;
}

export function createRawGithubClient({ repo, branch }: RawGithubClientConfig): DataClient {
  const base = `https://raw.githubusercontent.com/${repo}/${branch}/data`;

  function urlFor(path: DataPath): string {
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  return {
    urlFor,

    async get<T>(path: DataPath, options: FetchOptions = {}): Promise<T> {
      const { signal, bustCache = false, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
      const url = `${urlFor(path)}?t=${bustCache ? Date.now() : minuteStamp()}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      // 호출자가 준 signal 과 타임아웃을 함께 건다.
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: bustCache ? 'no-store' : 'default',
        });
        if (!response.ok) {
          throw new DataFetchError(
            `데이터를 불러오지 못했습니다 (HTTP ${response.status})`,
            path,
            response.status,
          );
        }
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof DataFetchError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new DataFetchError('요청 시간이 초과되었습니다', path);
        }
        throw new DataFetchError(error instanceof Error ? error.message : '알 수 없는 오류', path);
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}

const DATA_REPO = import.meta.env.VITE_DATA_REPO ?? 'khmass-liturgy/farm-animal-consulting';
const DATA_BRANCH = import.meta.env.VITE_DATA_BRANCH ?? 'main';

export const dataClient: DataClient = createRawGithubClient({
  repo: DATA_REPO,
  branch: DATA_BRANCH,
});
