import { describe, expect, it } from "vitest";
import {
  AGENT_MAX_ITERATIONS,
  partitionToolCalls,
  requiresApproval,
  toolCallSchema,
  toolDeclarationSchema,
  toolParameterSchema,
  toolResultSchema,
  type ToolDeclaration,
} from "./agent-tool";

const READONLY_DECL: ToolDeclaration = {
  name: "listCalendarEvents",
  description: "다가오는 일정을 조회한다",
  parameters: { type: "object", properties: {}, required: [] },
  kind: "readonly",
};

const MUTATING_DECL: ToolDeclaration = {
  name: "createCalendarEvent",
  description: "새 일정을 만든다",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "일정 제목" },
      startAt: { type: "string" },
    },
    required: ["title", "startAt"],
  },
  kind: "mutating",
};

describe("toolDeclarationSchema", () => {
  it("readonly/mutating 선언을 파싱한다", () => {
    expect(toolDeclarationSchema.parse(READONLY_DECL).kind).toBe("readonly");
    expect(toolDeclarationSchema.parse(MUTATING_DECL).kind).toBe("mutating");
  });

  it("Gemini 함수명 규칙(영문 시작)을 어기면 거부한다", () => {
    expect(() =>
      toolDeclarationSchema.parse({ ...READONLY_DECL, name: "3invalid" }),
    ).toThrow();
    expect(() =>
      toolDeclarationSchema.parse({ ...READONLY_DECL, name: "has space" }),
    ).toThrow();
  });

  it("kind가 enum 밖이면 거부한다", () => {
    expect(() =>
      toolDeclarationSchema.parse({ ...READONLY_DECL, kind: "destructive" }),
    ).toThrow();
  });
});

describe("toolParameterSchema", () => {
  it("중첩 object/array(enum 포함)를 재귀 파싱한다", () => {
    const nested = {
      type: "object" as const,
      properties: {
        tags: { type: "array" as const, items: { type: "string" as const } },
        mode: { type: "string" as const, enum: ["a", "b"] },
      },
      required: ["tags"],
    };
    expect(toolParameterSchema.parse(nested)).toEqual(nested);
  });

  it("지원하지 않는 type은 거부한다", () => {
    expect(() => toolParameterSchema.parse({ type: "null" })).toThrow();
  });
});

describe("toolCallSchema / toolResultSchema", () => {
  it("id 없는 단일 호출도 허용한다(Gemini 단일 호출)", () => {
    const call = toolCallSchema.parse({ name: "listCalendarEvents", args: {} });
    expect(call.id).toBeUndefined();
  });

  it("id 있는 병렬 호출과 결과를 파싱한다", () => {
    const call = toolCallSchema.parse({
      id: "call-1",
      name: "createCalendarEvent",
      args: { title: "회의", startAt: "2026-07-25T00:00:00.000Z" },
    });
    expect(call.id).toBe("call-1");
    const result = toolResultSchema.parse({
      id: "call-1",
      name: "createCalendarEvent",
      response: { ok: true },
    });
    expect(result.response).toEqual({ ok: true });
  });
});

describe("requiresApproval", () => {
  it("mutating만 승인을 요구한다", () => {
    expect(requiresApproval("mutating")).toBe(true);
    expect(requiresApproval("readonly")).toBe(false);
  });
});

describe("partitionToolCalls", () => {
  const catalog = [READONLY_DECL, MUTATING_DECL];

  it("readonly는 auto, mutating은 approval로 나눈다", () => {
    const { auto, approval, unknown } = partitionToolCalls(
      [
        { name: "listCalendarEvents", args: {} },
        { name: "createCalendarEvent", args: { title: "x", startAt: "y" } },
      ],
      catalog,
    );
    expect(auto.map((c) => c.name)).toEqual(["listCalendarEvents"]);
    expect(approval.map((c) => c.name)).toEqual(["createCalendarEvent"]);
    expect(unknown).toHaveLength(0);
  });

  it("카탈로그에 없는 도구는 실행하지 않고 unknown으로 격리한다(인젝션/할루시네이션 방어)", () => {
    const { auto, approval, unknown } = partitionToolCalls(
      [{ name: "deleteAllUsers", args: {} }],
      catalog,
    );
    expect(auto).toHaveLength(0);
    expect(approval).toHaveLength(0);
    expect(unknown.map((c) => c.name)).toEqual(["deleteAllUsers"]);
  });

  it("빈 호출 목록은 빈 분류를 반환한다", () => {
    expect(partitionToolCalls([], catalog)).toEqual({
      auto: [],
      approval: [],
      unknown: [],
    });
  });
});

describe("AGENT_MAX_ITERATIONS", () => {
  it("무한 루프 방지 상한이 양의 정수로 정의돼 있다", () => {
    expect(Number.isInteger(AGENT_MAX_ITERATIONS)).toBe(true);
    expect(AGENT_MAX_ITERATIONS).toBeGreaterThan(0);
  });
});
