import { describe, expect, it, vi } from "vitest";
import {
  deleteSourceEmbeddings,
  indexSource,
  searchEmbeddings,
  upsertEmbedding,
} from "./embeddings";

const USER_ID = "33333333-3333-4333-8333-333333333333";

function fakeFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

type FakeOpts = {
  onUpsert?: (payload: Record<string, unknown>, opts: unknown) => void;
  rpcData?: unknown[];
  rpcError?: string;
  deleteError?: string;
};

// embeddings 테이블: from().upsert(payload,opts) / from().delete().eq().eq().eq() / rpc(name,params)
function fakeSupabase(opts: FakeOpts = {}) {
  const { onUpsert, rpcData = [], rpcError, deleteError } = opts;
  const eq = () => ({ eq: () => ({ eq: async () => ({ error: deleteError ? { message: deleteError } : null }) }) });
  return {
    from: () => ({
      upsert: (payload: Record<string, unknown>, upsertOpts: unknown) => {
        onUpsert?.(payload, upsertOpts);
        return Promise.resolve({ error: null });
      },
      delete: () => ({ eq }),
    }),
    rpc: async () => ({
      data: rpcError ? null : rpcData,
      error: rpcError ? { message: rpcError } : null,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("upsertEmbedding", () => {
  it("벡터를 pgvector 리터럴 문자열로 넘긴다", async () => {
    let captured: Record<string, unknown> = {};
    const supabase = fakeSupabase({ onUpsert: (p) => (captured = p) });
    await upsertEmbedding(
      supabase,
      { userId: USER_ID, sourceType: "memo", sourceId: "m1", chunkIndex: 0, content: "x" },
      [0.1, 0.2, 0.3],
    );
    expect(captured.embedding).toBe("[0.1,0.2,0.3]");
    expect(captured.source_type).toBe("memo");
  });
});

describe("searchEmbeddings", () => {
  it("snake_case rpc 결과를 RetrievedChunk로 매핑", async () => {
    const supabase = fakeSupabase({
      rpcData: [{ source_type: "memo", source_id: "m1", content: "메모", similarity: 0.9 }],
    });
    const result = await searchEmbeddings(supabase, [0.1], 3);
    expect(result).toEqual([
      { sourceType: "memo", sourceId: "m1", content: "메모", similarity: 0.9 },
    ]);
  });

  it("rpc 에러면 던진다", async () => {
    const supabase = fakeSupabase({ rpcError: "boom" });
    await expect(searchEmbeddings(supabase, [0.1])).rejects.toThrow("boom");
  });
});

describe("indexSource", () => {
  it("빈 텍스트는 임베딩 없이 0(기존 삭제만)", async () => {
    const f = fakeFetch({});
    const supabase = fakeSupabase();
    const n = await indexSource(
      supabase,
      "key",
      { userId: USER_ID, sourceType: "memo", sourceId: "m1", text: "   " },
      f,
    );
    expect(n).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it("텍스트를 청크 임베딩 후 upsert하고 청크 수 반환", async () => {
    const upserts: Record<string, unknown>[] = [];
    const supabase = fakeSupabase({ onUpsert: (p) => upserts.push(p) });
    const f = fakeFetch({ embeddings: [{ values: [0.1, 0.2] }] });
    const n = await indexSource(
      supabase,
      "key",
      { userId: USER_ID, sourceType: "todo", sourceId: "t1", text: "할 일 내용" },
      f,
    );
    expect(n).toBe(1);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].content).toBe("할 일 내용");
    expect(upserts[0].embedding).toBe("[0.1,0.2]");
  });
});

describe("deleteSourceEmbeddings", () => {
  it("삭제 에러면 던진다", async () => {
    const supabase = fakeSupabase({ deleteError: "del fail" });
    await expect(
      deleteSourceEmbeddings(supabase, USER_ID, "memo", "m1"),
    ).rejects.toThrow("del fail");
  });
});
