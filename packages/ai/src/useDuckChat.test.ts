import { describe, expect, it } from "vitest";
import type { ToolResult } from "@ldd/core";
import { resolveDuckMessage, summarizeResults, type DuckChatResponse } from "./useDuckChat";

describe("resolveDuckMessage", () => {
  it("final은 LLM 텍스트를 그대로 사용", () => {
    const res: DuckChatResponse = { status: "final", text: "할 일은 2개야 꽥" };
    expect(resolveDuckMessage(res)).toBe("할 일은 2개야 꽥");
  });

  it("rule은 주입된 룰 대사 사용", () => {
    const res: DuckChatResponse = { status: "rule" };
    expect(resolveDuckMessage(res, () => "안녕! 반가워 꽥")).toBe("안녕! 반가워 꽥");
  });

  it("rule인데 룰 대사 주입이 없으면 기본 문구", () => {
    const res: DuckChatResponse = { status: "rule" };
    expect(resolveDuckMessage(res)).toContain("잘 모르겠어요");
  });

  it("unavailable은 서버가 준 안내 메시지를 그대로 사용", () => {
    const res: DuckChatResponse = { status: "unavailable", message: "지금은 어려워요" };
    expect(resolveDuckMessage(res)).toBe("지금은 어려워요");
  });

  it("approval_pending은 메시지가 아니라 null(승인 카드로 별도 표현)", () => {
    const res: DuckChatResponse = { status: "approval_pending", calls: [] };
    expect(resolveDuckMessage(res)).toBeNull();
  });
});

describe("summarizeResults", () => {
  it("전부 성공이면 완료 문구", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createCalendarEvent", response: { created: { id: "e1" } } },
    ];
    expect(summarizeResults(results)).toBe("완료했어요!");
  });

  it("하나라도 error 응답이 있으면 부분 실패 문구", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createCalendarEvent", response: { created: { id: "e1" } } },
      { id: "c2", name: "createCalendarEvent", response: { error: "실패" } },
    ];
    expect(summarizeResults(results)).toBe("일부 작업을 완료하지 못했어요.");
  });

  it("빈 배열이면 완료 문구(오류가 없으므로)", () => {
    expect(summarizeResults([])).toBe("완료했어요!");
  });
});
