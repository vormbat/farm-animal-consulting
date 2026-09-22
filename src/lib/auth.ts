/**
 * 인증 어댑터.
 *
 * 유료서비스 화면이 알아야 하는 것은 "지금 이 사람이 로그인했는가, 승인됐는가"
 * 뿐이다. 그것을 무엇이 판단하는지는 몰라도 된다. 지금은 아무도 로그인시키지
 * 않는 `nullAuthAdapter` 가 꽂혀 있고, 인증 방식이 정해지면 이 파일 맨 아래
 * 한 줄만 바꿔 끼운다.
 *
 * 원본은 Firebase Auth 를 화면 코드 안에서 직접 불렀고, 승인 여부는 공개
 * 저장소의 `premium/approved.json` 을 브라우저가 내려받아 자기 이메일과
 * 비교하는 방식이었다. 그 파일에는 회원 이메일이 그대로 들어 있고 로그인하지
 * 않아도 누구나 받을 수 있었다. 그래서 승인 판정을 이 경계 뒤로 옮긴다 —
 * `docs/decisions/0002-유료서비스-인증-자리.md` 참고.
 */

/** 로그인 화면에 버튼으로 나가는 수단 하나. */
export interface AuthMethod {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

/**
 * 화면에 필요한 만큼의 사용자.
 *
 * 이름·전화번호는 담지 않는다. 화면이 쓰지 않는 개인정보를 들고 다니면
 * 언젠가 로그나 에러 리포트에 실려 나간다.
 */
export interface AuthUser {
  readonly id: string;
  /** 화면에 보여 줄 한 줄(이메일 또는 표시 이름). */
  readonly label: string;
}

/**
 * 원본이 화면마다 따로 판단하던 다섯 가지 상태를 하나로 모은 것.
 *
 * `checking` 은 "아직 모른다" 다 — 로그인 여부를 묻는 중이거나 승인 여부를
 * 확인하는 중이거나. 화면 입장에서는 둘 다 기다리는 것 말고 할 일이 없다.
 */
export type AuthState =
  | { readonly status: 'checking' }
  | { readonly status: 'signed-out' }
  /** 로그인은 했지만 아직 승인 전. */
  | { readonly status: 'pending'; readonly user: AuthUser }
  | { readonly status: 'approved'; readonly user: AuthUser };

export interface AuthAdapter {
  /** 어떤 구현이 꽂혀 있는지. 화면에 쓰지는 않고 로그·테스트에서 쓴다. */
  readonly id: string;
  /** 비어 있으면 로그인 화면에 버튼을 두지 않는다. */
  readonly methods: readonly AuthMethod[];
  /**
   * 지금 상태. 같은 상태면 **같은 객체를 돌려줘야 한다** —
   * `useSyncExternalStore` 가 이 값의 동일성으로 다시 그릴지 정한다.
   */
  getState(): AuthState;
  /** 상태가 바뀌면 부른다. 해지 함수를 돌려준다. */
  subscribe(listener: () => void): () => void;
  signIn(methodId: string): Promise<void>;
  signOut(): Promise<void>;
  /** 비밀번호 로그인을 지원하는 구현만 갖는다. */
  resetPassword?(email: string): Promise<void>;
}

/** 아직 꽂히지 않은 기능을 눌렀을 때. 화면이 이 메시지를 그대로 보여 준다. */
export class AuthUnavailableError extends Error {
  constructor(message = '로그인 기능이 아직 연결되지 않았습니다') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

const SIGNED_OUT: AuthState = Object.freeze({ status: 'signed-out' as const });

/**
 * 아무도 로그인시키지 않는 구현.
 *
 * 인증을 흉내 내지 않는다는 점이 중요하다. 로컬 저장소에 '로그인됨' 을
 * 적어 두는 식으로 잠금 화면을 넘길 수 있게 만들면, 그 뒤에 붙일 유료 내용은
 * 자물쇠가 그림인 문 뒤에 놓이게 된다. 여기서는 언제나 로그아웃 상태다.
 */
export const nullAuthAdapter: AuthAdapter = {
  id: 'null',
  methods: [],
  getState: () => SIGNED_OUT,
  subscribe: () => () => {},
  signIn: () => Promise.reject(new AuthUnavailableError()),
  signOut: () => Promise.resolve(),
};

/** 로그인한 사람. 로그아웃·확인 중이면 null. */
export function currentUser(state: AuthState): AuthUser | null {
  return state.status === 'pending' || state.status === 'approved' ? state.user : null;
}

/** 유료 내용을 보여 줘도 되는가. */
export function isApproved(state: AuthState): boolean {
  return state.status === 'approved';
}

/** 로그인 수단이 하나라도 있는가 — 없으면 잠금 화면이 안내문만 보여 준다. */
export function canSignIn(adapter: AuthAdapter): boolean {
  return adapter.methods.length > 0;
}

/**
 * 지금 쓰는 구현.
 *
 * Firebase 든 자체 백엔드든, 새 어댑터를 만들어 이 한 줄을 바꾸면 된다.
 * 화면 코드는 한 줄도 손대지 않는다.
 */
export const authAdapter: AuthAdapter = nullAuthAdapter;
