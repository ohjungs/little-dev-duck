import { describe, expect, it } from "vitest";
import { actionLogEntrySchema, summarizeForLog } from "./action-log";

describe("actionLogEntrySchema", () => {
  it("정상 레코드를 파싱한다", () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      toolName: "createCalendarEvent",
      argsSummary: '{"title":"회의"}',
      status: "success" as const,
      resultSummary: '{"created":{"id":"e1"}}',
      createdAt: "2026-07-22T00:00:00+00:00",
    };
    expect(actionLogEntrySchema.parse(row).toolName).toBe("createCalendarEvent");
  });

  it("status가 success/error 외의 값이면 거부한다", () => {
    expect(() =>
      actionLogEntrySchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
        toolName: "x",
        argsSummary: "{}",
        status: "pending",
        resultSummary: "{}",
        createdAt: "2026-07-22T00:00:00+00:00",
      }),
    ).toThrow();
  });
});

describe("summarizeForLog", () => {
  it("짧은 객체는 JSON 그대로 반환한다", () => {
    expect(summarizeForLog({ title: "회의" })).toBe('{"title":"회의"}');
  });

  it("200자를 넘으면 잘라내고 말줄임표를 붙인다", () => {
    const big = { text: "a".repeat(300) };
    const result = summarizeForLog(big);
    expect(result.length).toBe(201);
    expect(result.endsWith("…")).toBe(true);
  });
});
