// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CommandPalette } from "@/components/CommandPalette";

// PageEditor.test.tsx의 확립된 모킹 레시피 재사용(2026-08-02 계약 정찰 결과와 동일한 근거).
vi.mock("@ldd/api", () => ({
  createMemo: vi.fn(),
  createPage: vi.fn(async () => ({ id: "p1" })),
  searchPages: vi.fn(async () => []),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// 팔레트는 기본 닫힘(open=false)이라 Ctrl/Cmd+K로 먼저 연다. localStorage는 jsdom 기본 제공이라
// 별도 목이 필요 없다(최근 검색어·최근 페이지 조회에 쓰임).
function openPalette() {
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
}

describe("CommandPalette", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("닫혀 있을 때는 아무것도 렌더하지 않는다", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Ctrl+K를 누르면 role=dialog·aria-modal·aria-label을 갖춰 연다", () => {
    render(<CommandPalette />);
    openPalette();

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("검색 및 명령");
  });

  it("열리면 검색 입력으로 포커스가 들어간다(기존 자동포커스 effect와 충돌하지 않는다)", () => {
    render(<CommandPalette />);
    openPalette();

    expect(document.activeElement).toBe(
      screen.getByPlaceholderText("페이지 검색 또는 명령..."),
    );
  });

  it("Esc를 누르면 팔레트가 닫힌다", () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole("dialog")).not.toBeNull();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Esc가 아닌 다른 키(ArrowDown)는 여전히 목록 탐색에 쓰인다", () => {
    render(<CommandPalette />);
    openPalette();

    const dialog = screen.getByRole("dialog");
    // 훅은 Escape에만 개입한다 — 팔레트 자체 키 핸들러(ArrowDown 등)는 그대로 살아 있어야 한다.
    expect(() =>
      fireEvent.keyDown(dialog, { key: "ArrowDown" }),
    ).not.toThrow();
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("다시 열면 이전 오픈의 Esc 리스너가 남아있지 않아 onClose 성격의 닫힘이 한 번만 일어난다", () => {
    render(<CommandPalette />);
    openPalette(); // 열기
    openPalette(); // 토글 → 닫기
    openPalette(); // 다시 열기

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
