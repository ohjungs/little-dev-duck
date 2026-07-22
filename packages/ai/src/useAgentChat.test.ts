import { describe, expect, it } from "vitest";
import type { ToolResult } from "@ldd/core";
import { summarizeResults } from "./useAgentChat";

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
