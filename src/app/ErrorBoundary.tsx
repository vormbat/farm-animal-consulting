import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 탭이 바뀌면 오류 상태를 초기화하기 위한 키 */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * 탭 하나가 터져도 헤더와 나머지 탭은 살아 있어야 한다.
 * 원본은 단일 파일이라 한 패널의 예외가 전체 렌더를 멈출 수 있었다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[탭 렌더 실패]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="font-semibold">이 화면을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-lg bg-[var(--color-header-from)] px-4 py-2 text-sm font-semibold text-white"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
