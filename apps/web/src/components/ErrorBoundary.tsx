"use client";
import { Component, type ReactNode, type ErrorInfo } from "react";
import { recordClientError } from "../lib/clientErrorLog";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

// 2026-08-01 : 수정 - 에러바운더리 - componentDidCatch 견고성 회귀 수정
// React는 componentDidCatch/getDerivedStateFromError에 Error가 아닌 값(null/undefined/
// 문자열 등)도 그대로 전달할 수 있다. instanceof Error 가드 없이 .message에 접근하면
// 이 메서드 자체가 새 예외를 던져 바운더리를 우회해버린다(Next.js 기본 크래시 화면으로 낙하).
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.toString();
  }
  return String(error);
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
    recordClientError(toErrorMessage(error));
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-lg font-semibold mb-2">문제가 발생했어요</p>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message ?? "알 수 없는 오류"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 text-sm rounded border hover:bg-accent"
            >
              다시 시도
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
