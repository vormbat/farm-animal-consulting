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
import type { DataMap, DataPath } from '@/types/data';
import type { EditorialMap, EditorialPath } from '@/types/editorial';

export type { DataMap, DataPath, EditorialMap, EditorialPath };

/** 수집물과 편집물을 합친 경로. 읽는 방식은 같고 출처만 다르다. */
export type AnyPath = DataPath | EditorialPath;

export interface FetchOptions {
  signal?: AbortSignal;
  /** 갱신 버튼처럼 캐시를 무시해야 할 때만 true. */
  bustCache?: boolean;
  timeoutMs?: number;
}

export interface DataClient {
  /** 경로만 주면 반환 타입이 정해진다 — 대응표는 수집 스키마에서 생성된다. */
  get<K extends DataPath>(path: K, options?: FetchOptions): Promise<DataMap[K]>;
  /**
   * 사람이 편집하는 파일. 읽는 방식은 같지만 계약이 생성물이 아니라
   * 손으로 쓴 것이라(`src/types/editorial.ts`) 통로를 나눠 둔다.
   */
  getEditorial<K extends EditorialPath>(path: K, options?: FetchOptions): Promise<EditorialMap[K]>;
  /** 화면에 "원문 보기" 링크를 걸 때 쓴다. */
  urlFor(path: AnyPath): string;
}

export class DataFetchError extends Error {
  constructor(
    message: string,
    readonly path: AnyPath,
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
  return createHttpClient(`https://raw.githubusercontent.com/${repo}/${branch}/data`);
}

/**
 * 개발 서버가 저장소의 `data/` 를 그대로 내주는 경로(vite.config.ts 의 serveLocalData).
 * 방금 돌린 수집 결과를 원격에 올리지 않고 바로 확인할 수 있다.
 */
export function createLocalClient(baseUrl = '/data'): DataClient {
  return createHttpClient(baseUrl.replace(/\/+$/, ''));
}

function createHttpClient(base: string): DataClient {
  function urlFor(path: AnyPath): string {
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  async function read<T>(path: AnyPath, options: FetchOptions = {}): Promise<T> {
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
  }

  return {
    urlFor,
    get: (path, options) => read(path, options),
    getEditorial: (path, options) => read(path, options),
  };
}

/**
 * 저장소를 지정하면 거기서 읽고, 없으면 개발 서버의 로컬 `data/` 를 읽는다.
 *
 * 배포 워크플로는 VITE_DATA_REPO 를 저장소 컨텍스트에서 항상 채워 넣으므로,
 * 값이 비어 있다는 것은 곧 로컬 개발이라는 뜻이다. 저장소 이름을 코드에
 * 적어 두지 않는 쪽을 택했다 — 적어 두면 저장소를 옮길 때 잊어버린다.
 */
const DATA_REPO = import.meta.env.VITE_DATA_REPO;
const DATA_BRANCH = import.meta.env.VITE_DATA_BRANCH ?? 'main';

export const dataClient: DataClient = DATA_REPO
  ? createRawGithubClient({ repo: DATA_REPO, branch: DATA_BRANCH })
  : createLocalClient();
