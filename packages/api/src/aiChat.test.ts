import { describe, expect, it, vi } from "vitest";
import type { ToolDeclaration } from "@ldd/core";
import { runDuckTurn } from "./aiChat";
import { NO_TOOLS_ADAPTER, type Adapter } from "./agent";

// 임베딩(batchEmbedContents) → 검색(rpc) → 생성/도구 판단(generateContent) 순서. URL로 구분하고
// generateContent 호출 시 보낸 body를 캡처해 RAG 컨텍스트가 실제로 실렸는지 검증할 수 있게 한다.
function fakeFetch(generateParts: unknown[] = [{ text: "오늘 할 일은 2개야 꽥" }]) {
  const bodies: string[] = [];
  const fn = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes(":batchEmbedContents")) {
      return { ok: true, status: 200, json: async () => ({ embeddings: [{ values: [0.1, 0.2] }] }), text: async () => "" };
    }
    if (url.includes(":generateContent")) {
      bodies.push(String(init?.body ?? ""));
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: generateParts } }] }),
        text: async () => "",
      };
    }
    throw new Error(`예상치 못한 URL: ${url}`);
  });
  return { fn, bodies };
}

function fakeSupabase(rpcData: unknown[] = []) {
  return {
    rpc: async () => ({ data: rpcData, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const MUTATING: ToolDeclaration = {
  name: "createEvent",
  description: "새 일정을 만든다",
  parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
  kind: "mutating",
};
function calendarAdapter(): Adapter {
  return { catalog: [MUTATING], execute: async (call) => ({ id: call.id, name: call.name, response: {} }) };
}

describe("runDuckTurn", () => {
  it("룰로 분기되는 인사는 Gemini 호출 없이 status=rule", async () => {
    const { fn } = fakeFetch();
    const result = await runDuckTurn(fakeSupabase(), "key", "안녕", NO_TOOLS_ADAPTER, fn);
    expect(result).toEqual({ status: "rule" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("질문은 임베딩→검색→에이전트 턴으로 답을 만든다(도구 없는 순수 RAG 대화)", async () => {
    const { fn, bodies } = fakeFetch();
    const supabase = fakeSupabase([
      { source_type: "todo", source_id: "t1", content: "장보기", similarity: 0.8 },
    ]);
    const result = await runDuckTurn(supabase, "key", "오늘 할 일 뭐 있어?", NO_TOOLS_ADAPTER, fn);

    expect(result).toEqual({ status: "final", text: "오늘 할 일은 2개야 꽥" });
    // 임베딩 1회 + 생성 1회 = fetch 2회
    expect(fn).toHaveBeenCalledTimes(2);
    // 검색된 자료가 systemPrompt로 실려갔는지, 도구 없는 요청엔 tools 필드가 없는지 확인.
    expect(bodies[0]).toContain("장보기");
    expect(JSON.parse(bodies[0])).not.toHaveProperty("tools");
  });

  it("도구 카탈로그가 있으면 tools와 함께 요청하고, mutating 호출은 승인 대기로 반환한다", async () => {
    const { fn, bodies } = fakeFetch([
      { functionCall: { name: "createEvent", args: { title: "회의" }, id: "c1" } },
    ]);
    const result = await runDuckTurn(fakeSupabase(), "key", "내일 회의 일정 잡아줘", calendarAdapter(), fn);

    expect(result.status).toBe("approval_pending");
    expect(JSON.parse(bodies[0]).tools[0].functionDeclarations[0].name).toBe("createEvent");
  });

  it("extraSystemNote가 주어지면 RAG 컨텍스트 뒤에 이어붙인다", async () => {
    const { fn, bodies } = fakeFetch();
    await runDuckTurn(fakeSupabase(), "key", "일정 알려줘", NO_TOOLS_ADAPTER, fn, "캘린더 미연동 안내");
    expect(bodies[0]).toContain("캘린더 미연동 안내");
  });

  it("쿼터 소진(429)은 LddError(quota_exceeded)로 전파 → 호출측 폴백", async () => {
    const f = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(":batchEmbedContents")) {
        return { ok: true, status: 200, json: async () => ({ embeddings: [{ values: [0.1] }] }), text: async () => "" };
      }
      return { ok: false, status: 429, json: async () => ({}), text: async () => "rate" };
    });
    await expect(
      runDuckTurn(fakeSupabase(), "key", "이번 주 일정 알려줘", NO_TOOLS_ADAPTER, f),
    ).rejects.toMatchObject({ code: "quota_exceeded" });
  });
});
