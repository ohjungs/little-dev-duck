import { describe, expect, it } from "vitest";
import {
  AGENT_MAX_ITERATIONS,
  type ToolCall,
  type ToolDeclaration,
  type ToolResult,
} from "@ldd/core";
import { executeApprovedCalls, runAgentTurn, type Adapter } from "./agent";

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

// 요청 body(특히 첫 턴 프롬프트)를 캡처해 preamble 조립을 검증할 때 쓴다.
function capturingFetch(response: Response): {
  fetchImpl: typeof fetch;
  bodies: string[];
} {
  const bodies: string[] = [];
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ""));
    return response;
  }) as unknown as typeof fetch;
  return { fetchImpl, bodies };
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

  it("도구 카탈로그가 있으면 액션 요청 시 도구를 우선하라는 지침을 프롬프트에 포함한다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    await runAgentTurn("일정 잡아줘", mockAdapter(), "key", fetchImpl, "[사용자 자료]\n(관련 자료 없음)");
    expect(bodies[0]).toContain("사용해 처리하라");
  });

  it("필요한 정보가 불명확하면 임의로 채우지 말고 되물으라는 지침도 함께 포함한다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    await runAgentTurn("일정 잡아줘", mockAdapter(), "key", fetchImpl);
    expect(bodies[0]).toContain("먼저 무엇이 필요한지 되물어라");
  });

  it("도구 카탈로그가 비어 있으면(NO_TOOLS_ADAPTER) 그 지침을 넣지 않는다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    const noTools: Adapter = { catalog: [], execute: async (call) => ({ id: call.id, name: call.name, response: {} }) };
    await runAgentTurn("아무 질문", noTools, "key", fetchImpl);
    expect(bodies[0]).not.toContain("사용해 처리하라");
  });

  it("오늘 날짜(KST)를 프롬프트에 명시해 상대 날짜 계산 근거를 준다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    const fixedNow = () => new Date("2026-07-23T00:00:00+09:00");
    await runAgentTurn("q", mockAdapter(), "key", fetchImpl, undefined, fixedNow);
    expect(bodies[0]).toContain("2026년 7월 23일");
  });
});

describe("executeApprovedCalls", () => {
  it("승인된 mutating 도구를 어댑터로 실행한다", async () => {
    let executed: ToolCall | null = null;
    const adapter = mockAdapter(async (call) => {
      executed = call;
      return { id: call.id, name: call.name, response: { ok: true } };
    });
    const results = await executeApprovedCalls(
      [{ id: "c1", name: "createEvent", args: { title: "회의" } }],
      adapter,
    );
    expect(executed).not.toBeNull();
    expect(results).toEqual([
      { id: "c1", name: "createEvent", response: { ok: true } },
    ]);
  });

  it("readonly 도구는 승인 경로로 실행하지 않고 거부한다(승인 UI 우회 차단)", async () => {
    let executed = false;
    const adapter = mockAdapter(async (call) => {
      executed = true;
      return { id: call.id, name: call.name, response: {} };
    });
    const results = await executeApprovedCalls(
      [{ id: "c1", name: "listEvents", args: {} }],
      adapter,
    );
    expect(executed).toBe(false);
    expect(results[0].response).toHaveProperty("error");
  });

  it("카탈로그 밖 도구는 실행하지 않고 거부한다", async () => {
    let executed = false;
    const adapter = mockAdapter(async (call) => {
      executed = true;
      return { id: call.id, name: call.name, response: {} };
    });
    const results = await executeApprovedCalls(
      [{ id: "c1", name: "deleteEverything", args: {} }],
      adapter,
    );
    expect(executed).toBe(false);
    expect(results[0].response).toHaveProperty("error");
  });

  it("배치 중 하나가 예외를 던져도 나머지 호출을 계속 실행한다(부분 실패가 전체를 지우지 않음)", async () => {
    const executedIds: string[] = [];
    const adapter = mockAdapter(async (call) => {
      if (call.id === "fail") throw new Error("Google 401");
      executedIds.push(call.id ?? "");
      return { id: call.id, name: call.name, response: { ok: true } };
    });
    const results = await executeApprovedCalls(
      [
        { id: "c1", name: "createEvent", args: { title: "첫 회의" } },
        { id: "fail", name: "createEvent", args: { title: "실패할 회의" } },
        { id: "c3", name: "createEvent", args: { title: "세 번째 회의" } },
      ],
      adapter,
    );
    // 실패한 호출 앞뒤로 성공한 두 건이 모두 결과에 남는다 — 하나의 예외가 배치 전체를 지우지 않음.
    expect(executedIds).toEqual(["c1", "c3"]);
    expect(results).toHaveLength(3);
    expect(results[0].response).toEqual({ ok: true });
    expect(results[1].response).toHaveProperty("error");
    expect(results[2].response).toEqual({ ok: true });
  });
});
