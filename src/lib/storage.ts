/**
 * localStorage 래퍼.
 *
 * 원본은 `localStorage.getItem` 결과를 그대로 `JSON.parse` 했기 때문에,
 * 저장 구조를 바꾸면 예전 값을 읽다 예외가 터지거나 조용히 깨진 상태로 렌더됐다.
 * 여기서는 키마다 버전을 붙이고, 버전이 다르거나 파싱에 실패하면 기본값으로 되돌린다.
 *
 * 사생활 보호 모드·차단된 사이트 데이터에서는 접근 자체가 예외를 던지므로
 * 읽기·쓰기 전부 try/catch 로 감싼다. 저장이 안 되더라도 화면은 동작해야 한다.
 */
const PREFIX = 'fac';

export interface Store<T> {
  read(): T;
  write(value: T): void;
  clear(): void;
}

interface Envelope<T> {
  v: number;
  d: T;
}

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  return typeof value === 'object' && value !== null && 'v' in value && 'd' in value;
}

export function createStore<T>(
  key: string,
  version: number,
  fallback: T,
  /** 저장된 값이 지금 기대하는 모양인지 확인한다. 통과하지 못하면 기본값을 쓴다. */
  validate: (value: unknown) => value is T = (_v): _v is T => true,
): Store<T> {
  const storageKey = `${PREFIX}:${key}`;

  return {
    read() {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw === null) return fallback;
        const parsed: unknown = JSON.parse(raw);
        if (!isEnvelope<T>(parsed) || parsed.v !== version) return fallback;
        return validate(parsed.d) ? parsed.d : fallback;
      } catch {
        return fallback;
      }
    },
    write(value) {
      try {
        const envelope: Envelope<T> = { v: version, d: value };
        window.localStorage.setItem(storageKey, JSON.stringify(envelope));
      } catch {
        // 저장 실패는 조용히 넘긴다 — 화면 동작을 막을 이유가 없다.
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // 위와 같다.
      }
    },
  };
}
