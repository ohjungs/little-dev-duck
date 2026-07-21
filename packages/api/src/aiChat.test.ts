import { describe, expect, it, vi } from "vitest";
import { answerQuestion } from "./aiChat";

// 임베딩(batchEmbedContents) → 검색(rpc) → 생성(generateContent) 순서. URL로 임베딩/생성 응답을 구분.
function fakeFetch() {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes(":batchEmbedContents")) {
      return { ok: true, status: 200, json: async () => ({ embeddings: [{ values: [0.1, 0.2] }] }), text: async () => "" };
    }
    if (url.includes(":generateContent")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "오늘 할 일은 2개야 꽥" }] } }] }),
        text: async () => "",
      };
    }
    throw new Error(`예상치 못한 URL: ${url}`);
  });
}

function fakeSupabase(rpcData: unknown[] = []) {
  return {
    rpc: async () => ({ data: rpcData, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("answerQuestion", () => {
  it("룰로 분기되는 인사는 Gemini 호출 없이 route=rule, answer=null", async () => {
    const f = fakeFetch();
    const result = await answerQuestion(fakeSupabase(), "key", "안녕", f);
    expect(result.route).toBe("rule");
    expect(result.answer).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("질문은 임베딩→검색→생성으로 답을 만들고 sources를 채운다", async () => {
    const f = fakeFetch();
    const supabase = fakeSupabase([
      { source_type: "todo", source_id: "t1", content: "장보기", similarity: 0.8 },
    ]);
    const result = await answerQuestion(supabase, "key", "오늘 할 일 뭐 있어?", f);

    expect(result.route).toBe("llm");
    expect(result.answer).toContain("할 일");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].sourceType).toBe("todo");
    // 임베딩 1회 + 생성 1회 = fetch 2회
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("쿼터 소진(429)은 LddError(quota_exceeded)로 전파 → 호출측 폴백", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}), text: async () => "rate" });
    await expect(
      answerQuestion(fakeSupabase(), "key", "이번 주 일정 알려줘", f),
    ).rejects.toMatchObject({ code: "quota_exceeded" });
  });
});
