import { describe, expect, it } from "vitest";
import {
  AGENT_MAX_ITERATIONS,
  type ToolCall,
  type ToolDeclaration,
  type ToolResult,
} from "@ldd/core";
import { composeAdapters, executeApprovedCalls, runAgentTurn, type Adapter } from "./agent";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAppActionsAdapter } from "./appActions";

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

describe("composeAdapters", () => {
  const OTHER_DECL: ToolDeclaration = {
    name: "listIssues",
    description: "이슈를 조회한다",
    parameters: { type: "object", properties: {} },
    kind: "readonly",
  };

  it("빈 배열이면 NO_TOOLS_ADAPTER(빈 catalog)를 반환한다", () => {
    const composed = composeAdapters([]);
    expect(composed.catalog).toEqual([]);
  });

  it("catalog가 비어 있는 어댑터는 걸러낸다", () => {
    const empty: Adapter = { catalog: [], execute: async (c) => ({ id: c.id, name: c.name, response: {} }) };
    const composed = composeAdapters([empty, mockAdapter()]);
    expect(composed.catalog.map((d) => d.name)).toEqual(["listEvents", "createEvent"]);
  });

  it("여러 어댑터의 catalog를 이어붙이고 도구명으로 올바른 어댑터에 위임한다", async () => {
    let calendarCalled = false;
    let issuesCalled = false;
    const calendar = mockAdapter(async (call) => {
      calendarCalled = true;
      return { id: call.id, name: call.name, response: { from: "calendar" } };
    });
    const issues: Adapter = {
      catalog: [OTHER_DECL],
      execute: async (call) => {
        issuesCalled = true;
        return { id: call.id, name: call.name, response: { from: "issues" } };
      },
    };
    const composed = composeAdapters([calendar, issues]);

    expect(composed.catalog.map((d) => d.name)).toEqual([
      "listEvents",
      "createEvent",
      "listIssues",
    ]);

    const result = await composed.execute({ id: "c1", name: "listIssues", args: {} });
    expect(issuesCalled).toBe(true);
    expect(calendarCalled).toBe(false);
    expect(result.response).toEqual({ from: "issues" });
  });

  it("두 어댑터가 같은 도구명을 선언하면 먼저 온 어댑터가 catalog와 execute 둘 다 우선한다", async () => {
    const firstDecl: ToolDeclaration = { ...OTHER_DECL, description: "첫 번째" };
    const secondDecl: ToolDeclaration = { ...OTHER_DECL, description: "두 번째" };
    const first: Adapter = {
      catalog: [firstDecl],
      execute: async (c) => ({ id: c.id, name: c.name, response: { from: "first" } }),
    };
    const second: Adapter = {
      catalog: [secondDecl],
      execute: async (c) => ({ id: c.id, name: c.name, response: { from: "second" } }),
    };
    const composed = composeAdapters([first, second]);

    // catalog에는 첫 어댑터의 선언만 남는다(dedup).
    expect(composed.catalog).toEqual([firstDecl]);
    // execute도 첫 어댑터로 위임된다(catalog 표시와 실제 실행 대상이 일치).
    const result = await composed.execute({ id: "c1", name: OTHER_DECL.name, args: {} });
    expect(result.response).toEqual({ from: "first" });
  });

  it("어느 어댑터에도 없는 도구명이면 에러 결과를 반환한다(어댑터 2개 이상 합성 시)", async () => {
    // 어댑터가 1개뿐이면 composeAdapters가 그 어댑터를 그대로 반환한다(미등록 도구 처리는 어댑터 자신의
    // 몫, googleCalendar.test.ts 등에서 이미 검증됨) — 여기서는 합성 자체의 위임 로직을 검증하기 위해
    // 어댑터 2개로 구성한다.
    const issues: Adapter = {
      catalog: [OTHER_DECL],
      execute: async (c) => ({ id: c.id, name: c.name, response: { from: "issues" } }),
    };
    const composed = composeAdapters([mockAdapter(), issues]);
    const result = await composed.execute({ id: "c1", name: "deleteEverything", args: {} });
    expect(result.response).toHaveProperty("error");
  });
});

// 2026-07-26 : 오리 - 혼합턴 - 조회절반유실 수정
// "이번 주 마감 알려주고 장보기도 추가해줘"처럼 조회+변경이 섞여 오면, 전에는 변경만 승인
// 카드로 올리고 **조회 질문에는 아예 답하지 않았다**(auto 호출이 조용히 버려짐).
// 조회를 먼저 실행해 답을 만들고, 변경은 그대로 승인 대기로 올린다.
//
// **절대 깎으면 안 되는 것**: 변경 도구는 승인 전에 실행되지 않는다(T0-4). 아래 첫 테스트가 그걸 지킨다.
describe("조회와 변경이 섞인 턴", () => {
  it("조회는 실행하고 변경은 실행하지 않는다", async () => {
    const { fetchImpl } = scriptedFetch([
      ok([
        { functionCall: { name: "listEvents", args: {}, id: "r1" } },
        { functionCall: { name: "createEvent", args: { title: "회의" }, id: "w1" } },
      ]),
      ok([{ text: "이번 주엔 일정이 없어요." }]),
    ]);
    const executed: string[] = [];
    const adapter = mockAdapter(async (call) => {
      executed.push(call.name);
      return { id: call.id, name: call.name, response: { events: [] } };
    });
    const result = await runAgentTurn("일정 알려주고 회의도 잡아줘", adapter, "key", fetchImpl);

    expect(executed).toEqual(["listEvents"]);
    expect(executed).not.toContain("createEvent");
    expect(result.status).toBe("approval_pending");
  });

  it("조회 답변을 승인 카드와 함께 돌려준다", async () => {
    const { fetchImpl } = scriptedFetch([
      ok([
        { functionCall: { name: "listEvents", args: {}, id: "r1" } },
        { functionCall: { name: "createEvent", args: { title: "회의" }, id: "w1" } },
      ]),
      ok([{ text: "이번 주엔 일정이 없어요." }]),
    ]);
    const result = await runAgentTurn("일정 알려주고 회의도 잡아줘", mockAdapter(), "key", fetchImpl);
    expect(result.status).toBe("approval_pending");
    if (result.status === "approval_pending") {
      expect(result.calls.map((c) => c.name)).toEqual(["createEvent"]);
      expect(result.text).toContain("일정이 없어요");
    }
  });

  it("변경만 있는 턴은 예전처럼 즉시 반환한다(Gemini 재호출 없음)", async () => {
    const { fetchImpl, calls } = scriptedFetch([
      ok([{ functionCall: { name: "createEvent", args: { title: "회의" }, id: "w1" } }]),
    ]);
    const result = await runAgentTurn("회의 잡아줘", mockAdapter(), "key", fetchImpl);
    expect(result.status).toBe("approval_pending");
    if (result.status === "approval_pending") expect(result.text).toBeUndefined();
    expect(calls()).toBe(1);
  });

  it("조회 뒤 모델이 변경을 다시 내밀어도 승인 대기로 끝난다(무한 루프 없음)", async () => {
    const { fetchImpl } = scriptedFetch([
      ok([
        { functionCall: { name: "listEvents", args: {}, id: "r1" } },
        { functionCall: { name: "createEvent", args: { title: "회의" }, id: "w1" } },
      ]),
      ok([{ functionCall: { name: "createEvent", args: { title: "회의" }, id: "w2" } }]),
    ]);
    let created = false;
    const adapter = mockAdapter(async (call) => {
      if (call.name === "createEvent") created = true;
      return { id: call.id, name: call.name, response: { events: [] } };
    });
    const result = await runAgentTurn("일정 알려주고 회의도 잡아줘", adapter, "key", fetchImpl);
    expect(created).toBe(false);
    expect(result.status).toBe("approval_pending");
  });
});

// 2026-07-26 : 오리 - 지시문 - 조회도구와자료지침충돌
// listTodos를 만들어 놔도 모델이 부르지 않으면 없는 기능이다. 지시문에는 "[사용자 자료]에 없으면
// 모른다고 답하라"가 강하게 들어 있어, "이번 주 마감 뭐 있어?" 같은 **사실 질문**이 도구 대신
// 자료 쪽으로 기울 여지가 있었다. 실제 모델 거동은 쿼터 없이 확인할 수 없으므로,
// 여기서는 **지시문이 그 공백을 덮는지**만 결정적으로 검사한다.
describe("조회 도구와 자료 지침의 충돌 방지", () => {
  it("목록 조회는 자료만 보고 단정하지 말고 도구로 확인하라고 지시한다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    await runAgentTurn("이번 주 마감 뭐 있어?", mockAdapter(), "key", fetchImpl);
    expect(bodies[0]).toContain("그 도구로 확인한 뒤");
  });

  it("[사용자 자료]가 전체가 아니라 검색된 일부라는 사실을 알려준다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    await runAgentTurn("남은 할 일 뭐야?", mockAdapter(), "key", fetchImpl);
    // 이 한 문장이 핵심이다 — 상위 k개로 개수를 세면 조용히 틀린 답이 나온다.
    expect(bodies[0]).toContain("전체 목록이 아니므로");
  });

  it("도구가 없으면 이 지침도 넣지 않는다(쓸데없는 토큰 낭비 방지)", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    const noTools: Adapter = {
      catalog: [],
      execute: async (call) => ({ id: call.id, name: call.name, response: {} }),
    };
    await runAgentTurn("아무 질문", noTools, "key", fetchImpl);
    expect(bodies[0]).not.toContain("전체 목록이 아니므로");
  });
});

// 2026-07-26 : 오리 - 도구전달 - 선언과전송사이
// 도구를 선언하고 카탈로그에 넣어도, 요청 본문에 실려 나가지 않으면 오리에겐 없는 기능이다.
// 그 사이를 검사하는 테스트가 없었다 — 이 세션에서 "만들어 놓고 입구에서 막혀 있던" 부류를
// 두 번 겪었으므로(짧은 명령 라우팅, 임베딩 날짜) 선언→전송 구간도 잠근다.
describe("도구 카탈로그가 실제로 오리에게 전달된다", () => {
  it("카탈로그의 도구 이름이 요청 본문에 실린다", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    await runAgentTurn("q", mockAdapter(), "key", fetchImpl);
    expect(bodies[0]).toContain("listEvents");
    expect(bodies[0]).toContain("createEvent");
  });

  it("실제 앱 도구 목록에 조회 도구(listTodos)가 실려 나간다", async () => {
    const supabase = {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
      from: () => ({ select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
    } as unknown as SupabaseClient;
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    await runAgentTurn("이번 주 마감 뭐 있어?", createAppActionsAdapter(supabase), "key", fetchImpl);
    expect(bodies[0]).toContain("listTodos");
  });

  it("카탈로그가 비면 tools 자체를 보내지 않는다(빈 목록은 Gemini가 거부)", async () => {
    const { fetchImpl, bodies } = capturingFetch(ok([{ text: "ok" }]));
    const noTools: Adapter = {
      catalog: [],
      execute: async (call) => ({ id: call.id, name: call.name, response: {} }),
    };
    await runAgentTurn("q", noTools, "key", fetchImpl);
    expect(bodies[0]).not.toContain("functionDeclarations");
  });
});
