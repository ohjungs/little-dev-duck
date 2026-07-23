import { describe, expect, it } from "vitest";
import { eventToState, parseOfficeEvents } from "./office-event";

describe("eventToState", () => {
  it("도구별 상태로 매핑한다", () => {
    expect(eventToState({ tool: "Edit", status: "ok" })).toBe("typing");
    expect(eventToState({ tool: "Read", status: "ok" })).toBe("reading");
    expect(eventToState({ tool: "Bash", status: "ok" })).toBe("server");
  });

  it("에러는 도구와 무관하게 물음표", () => {
    expect(eventToState({ tool: "Edit", status: "error" })).toBe("question");
  });

  it("미지의 도구는 idle로 폴백", () => {
    expect(eventToState({ tool: "MysteryTool", status: "ok" })).toBe("idle");
  });
});

describe("parseOfficeEvents", () => {
  it("정상 JSONL 줄만 이벤트로 파싱한다", () => {
    const jsonl = [
      JSON.stringify({
        agentId: "a1",
        role: "do",
        tool: "Edit",
        targetFile: "x.ts",
        status: "ok",
        ts: 1000,
      }),
      "  ", // 빈 줄
      "{ broken json", // 깨진 줄
      JSON.stringify({ agentId: "a2", role: "check", tool: "Read", status: "start", ts: 2000 }),
    ].join("\n");
    const events = parseOfficeEvents(jsonl);
    expect(events).toHaveLength(2);
    expect(events[0].agentId).toBe("a1");
    expect(events[1].tool).toBe("Read");
  });

  it("필수 필드가 빠진 줄은 건너뛴다", () => {
    const jsonl = JSON.stringify({ agentId: "a", tool: "Edit" }); // role/status/ts 없음
    expect(parseOfficeEvents(jsonl)).toHaveLength(0);
  });
});
