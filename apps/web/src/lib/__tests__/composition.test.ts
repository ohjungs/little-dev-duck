import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isComposingEnter, shouldSendOnKey } from "../composition";

// 2026-07-29 : 입력 - IME 조합 중 전송 방지 (Phase 54 T1)

describe("isComposingEnter", () => {
  it("조합 중이면 참 (Enter가 조합 확정이지 전송이 아니다)", () => {
    expect(isComposingEnter({ isComposing: true })).toBe(true);
  });

  it("keyCode 229도 조합이다 (isComposing을 안 주는 조합의 안전망)", () => {
    expect(isComposingEnter({ keyCode: 229 })).toBe(true);
  });

  it("평소 Enter는 막지 않는다", () => {
    expect(isComposingEnter({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(isComposingEnter({})).toBe(false);
  });
});

describe("IME 가드 단일 출처", () => {
  // 판정이 두 곳에 생기면 한쪽만 고쳐진다 — 실제로 X-017·X-018로 나뉘어 둘 다 미구현이었다.
  const files = [    "src/components/DuckChatPanel.tsx",
  ];

  it("메시지·오리 입력이 모두 같은 판정을 쓴다", () => {
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src).toContain("isComposingEnter");
      // 각자 keyCode 229를 다시 적으면 두 벌이다.
      expect(src).not.toMatch(/keyCode\s*===\s*229/);
    }
  });
});

describe("shouldSendOnKey (전송 키 판정, F-003)", () => {
  it("enter 모드: Enter는 전송", () => {
    expect(shouldSendOnKey("enter", { key: "Enter" })).toBe(true);
  });

  it("enter 모드: Shift+Enter는 줄바꿈", () => {
    expect(shouldSendOnKey("enter", { key: "Enter", shiftKey: true })).toBe(false);
  });

  it("ctrl-enter 모드: Enter는 줄바꿈", () => {
    expect(shouldSendOnKey("ctrl-enter", { key: "Enter" })).toBe(false);
  });

  it("ctrl-enter 모드: Ctrl+Enter·Cmd+Enter는 전송", () => {
    expect(shouldSendOnKey("ctrl-enter", { key: "Enter", ctrlKey: true })).toBe(true);
    expect(shouldSendOnKey("ctrl-enter", { key: "Enter", metaKey: true })).toBe(true);
  });

  it("조합 중이면 어느 모드든 전송하지 않는다 (X-017 통합)", () => {
    expect(shouldSendOnKey("enter", { key: "Enter", isComposing: true })).toBe(false);
    expect(shouldSendOnKey("ctrl-enter", { key: "Enter", ctrlKey: true, keyCode: 229 })).toBe(false);
  });

  it("Enter가 아니면 아무 모드도 전송하지 않는다", () => {
    expect(shouldSendOnKey("enter", { key: "a" })).toBe(false);
    expect(shouldSendOnKey("ctrl-enter", { key: "s", ctrlKey: true })).toBe(false);
  });
});
