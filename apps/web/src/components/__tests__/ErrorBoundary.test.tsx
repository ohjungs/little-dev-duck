// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { readClientErrors } from "@/lib/clientErrorLog";

// 2026-08-01 : 테스트 - 에러바운더리 - componentDidCatch 계약 잠금
// 계약: console.error(error, errorInfo) 호출 + recordClientError(message)에는
// componentStack을 담지 않는다. localStorage 링에 남는 값이 메시지 문자열뿐인지로 검증한다.

function Thrower(): never {
  throw new Error("boom");
}

function ThrowNull(): never {
  throw null;
}

function ThrowUndefined(): never {
  throw undefined;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("자식이 throw하면 콘솔에 error·errorInfo를 남기고 폴백 UI를 렌더한다", () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText("문제가 발생했어요")).not.toBeNull();
    expect(screen.getByText("boom")).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();

    // React 자체도 개발 모드에서 캐치된 에러를 console.error로 한 번 더 남기므로
    // 정확한 호출 횟수가 아니라 componentDidCatch가 남긴 호출이 있는지로 검증한다.
    const ourCall = vi
      .mocked(console.error)
      .mock.calls.find(
        ([err]) => err instanceof Error && err.message === "boom",
      );
    expect(ourCall).toBeDefined();
    const [loggedError, loggedInfo] = ourCall!;
    expect(loggedError).toBeInstanceOf(Error);
    expect((loggedError as Error).message).toBe("boom");
    expect(loggedInfo).toHaveProperty("componentStack");
  });

  it("localStorage 링에는 message 문자열만 남고 componentStack은 담기지 않는다", () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );

    const entries = readClientErrors();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("boom");
    expect(Object.keys(entries[0]).sort()).toEqual(["at", "message"]);
  });

  // 2026-08-01 : 회귀 - 에러바운더리 - non-Error throw가 바운더리를 우회하지 않는지 잠금
  // React 런타임은 componentDidCatch에 Error가 아닌 값도 그대로 넘길 수 있다(null/undefined 등).
  // instanceof Error 가드 없이 .message에 접근하면 이 메서드 자체가 새 예외를 던져
  // 폴백 UI를 렌더하지 못하고 상위로 크래시가 전파된다.
  it("자식이 null을 throw해도 크래시하지 않고 폴백 UI를 렌더한다", () => {
    render(
      <ErrorBoundary>
        <ThrowNull />
      </ErrorBoundary>,
    );

    expect(screen.getByText("문제가 발생했어요")).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();

    const entries = readClientErrors();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("null");
  });

  it("다시 시도 버튼을 누르면 hasError를 초기화하고 자식을 재렌더한다", () => {
    let shouldThrow = true;
    function MaybeThrow(): ReactNode {
      if (shouldThrow) throw new Error("boom-once");
      return <p>복구됨</p>;
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("문제가 발생했어요")).not.toBeNull();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(screen.getByText("복구됨")).not.toBeNull();
    expect(screen.queryByText("문제가 발생했어요")).toBeNull();
  });

  it("자식이 undefined를 throw해도 크래시하지 않고 폴백 UI를 렌더한다", () => {
    render(
      <ErrorBoundary>
        <ThrowUndefined />
      </ErrorBoundary>,
    );

    expect(screen.getByText("문제가 발생했어요")).not.toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).not.toBeNull();

    const entries = readClientErrors();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("undefined");
  });
});
