import { describe, expect, it } from "vitest";
import {
  AGENT_MAX_ITERATIONS,
  type ToolCall,
  type ToolDeclaration,
  type ToolResult,
} from "@ldd/core";
import { runAgentTurn, type Adapter } from "./agent";

const READONLY: ToolDeclaration = {
  name: "listEvents",
  description: "다가오는 일정을 조회한다",
  parameters: { type: "object", properties: {} },
  kind: "readonly",
};
const MUTATING: ToolDeclaration = {
  name: "createEvent",
  description: "새 일정을 만든다",
  parameters: {
    type: "object",
    properties: { title: { type: "string" } },
    required: ["title"],
  },
  kind: "mutating",
};

// Gemini generateContent 응답을 최소 형태로 흉내낸다(res.ok/status/json/text만 사용).
function ok(parts: unknown[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts } }] }),
  } as unknown as Response;
}
function fail(status: number): Response {
  return {
    ok: false,
    status,
    text: async () => "boom",
  } as unknown as Response;
}

// 스크립트된 응답을 순서대로 돌려주는 목 fetch. 호출 수도 검증할 수 있게 카운터를 노출.
function scriptedFetch(responses: Response[]): {
  fetchImpl: typeof fetch;
  calls: () => number;
} {
  let i = 0;
  const fetchImpl = (async () => {
    const r = responses[i];
    i += 1;
    if (!r) throw new Error("fetch가 스크립트보다 많이 호출됨");
    return r;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls: () => i };
}

function mockAdapter(
  execute?: (call: ToolCall) => Promise<ToolResult>,
): Adapter {
  return {
    catalog: [READONLY, MUTATING],
    execute:
      execute ??
      (async (call) => ({ id: call.id, name: call.name, response: { events: [] } })),
  };
}

describe("runAgentTurn", () => {
  it("도구 없이 바로 답하면 final을 반환한다", async () => {
    const { fetchImpl } = scriptedFetch([ok([{ text: "안녕하세요!" }])]);
    const result = await runAgentTurn("안녕", mockAdapter(), "key", fetchImpl);
    expect(result).toEqual({ status: "final", text: "안녕하세요!" });
  });

  it("readonly 도구는 자동 실행하고 결과를 되먹여 최종 답을 낸다", async () => {
    const { fetchImpl } = scriptedFetch([
      ok([{ functionCall: { name: "listEvents", args: {}, id: "c1" } }]),
      ok([{ text: "일정이 없어요." }]),
    ]);
    let executed = false;
    const adapter = mockAdapter(async (call) => {
      executed = true;
      return { id: call.id, name: call.name, response: { events: [] } };
    });
    const result = await runAgentTurn("일정 뭐 있어?", adapter, "key", fetchImpl);
    expect(executed).toBe(true);
    expect(result).toEqual({ status: "final", text: "일정이 없어요." });
  });

  it("mutating 도구는 실행하지 않고 승인 대기로 즉시 반환한다", async () => {
    const { fetchImpl, calls } = scriptedFetch([
      ok([
        { functionCall: { name: "createEvent", args: { title: "회의" }, id: "c1" } },
      ]),
    ]);
    let executed = false;
    const adapter = mockAdapter(async (call) => {
      executed = true;
      return { id: call.id, name: call.name, response: {} };
    });
    const result = await runAgentTurn("회의 잡아줘", adapter, "key", fetchImpl);
    expect(executed).toBe(false);
    expect(result.status).toBe("approval_pending");
    if (result.status === "approval_pending") {
      expect(result.calls.map((c) => c.name)).toEqual(["createEvent"]);
      expect(result.calls[0].args).toEqual({ title: "회의" });
    }
    // 두 번째 Gemini 호출 없이 즉시 반환(승인 전엔 재호출 안 함).
    expect(calls()).toBe(1);
  });

  it("카탈로그 밖 도구는 실행하지 않고 에러 결과를 되먹여 루프를 잇는다", async () => {
    const { fetchImpl } = scriptedFetch([
      ok([{ functionCall: { name: "deleteEverything", args: {}, id: "c1" } }]),
      ok([{ text: "그건 할 수 없어요." }]),
    ]);
    let executed = false;
    const adapter = mockAdapter(async (call) => {
      executed = true;
      return { id: call.id, name: call.name, response: {} };
    });
    const result = await runAgentTurn("다 지워줘", adapter, "key", fetchImpl);
    expect(executed).toBe(false); // 미등록 도구는 어댑터에 도달하지 않음
    expect(result).toEqual({ status: "final", text: "그건 할 수 없어요." });
  });

  it("도구 루프가 수렴하지 않으면 반복 상한에서 예외를 던진다", async () => {
    const responses = Array.from({ length: AGENT_MAX_ITERATIONS }, () =>
      ok([{ functionCall: { name: "listEvents", args: {}, id: "c1" } }]),
    );
    const { fetchImpl } = scriptedFetch(responses);
    await expect(
      runAgentTurn("계속 반복", mockAdapter(), "key", fetchImpl),
    ).rejects.toThrow(/상한/);
  });

  it("빈 응답이면 예외를 던진다", async () => {
    const { fetchImpl } = scriptedFetch([ok([])]);
    await expect(
      runAgentTurn("q", mockAdapter(), "key", fetchImpl),
    ).rejects.toThrow(/빈 응답/);
  });

  it("429는 quota_exceeded로 매핑돼 던져진다", async () => {
    const { fetchImpl } = scriptedFetch([fail(429)]);
    await expect(
      runAgentTurn("q", mockAdapter(), "key", fetchImpl),
    ).rejects.toThrow("429");
  });
});
