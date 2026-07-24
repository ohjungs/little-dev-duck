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
  onDelete?: () => void;
};

// embeddings 테이블: from().upsert(payload,opts) / from().delete().eq().eq().eq()[.gte()] / rpc(name,params)
// delete 체인은 eq 다수 + 선택적 gte 뒤 await 가능해야 하므로 thenable 체인으로 만든다.
function fakeSupabase(opts: FakeOpts = {}) {
  const { onUpsert, rpcData = [], rpcError, deleteError, onDelete } = opts;
  const makeDeleteChain = () => {
    const result = { error: deleteError ? { message: deleteError } : null };
    const chain: Record<string, unknown> = {
      eq: () => chain,
      gte: () => Promise.resolve(result),
      then: (resolve: (value: unknown) => void) => resolve(result),
    };
    return chain;
  };
  return {
    from: () => ({
      upsert: (payload: Record<string, unknown>, upsertOpts: unknown) => {
        onUpsert?.(payload, upsertOpts);
        return Promise.resolve({ error: null });
      },
      delete: () => {
        onDelete?.();
        return makeDeleteChain();
      },
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
    // indexSource는 이제 N번 개별 upsert 대신 단일 배치 upsert를 수행한다(rows 배열 1건).
    const batchPayloads: unknown[][] = [];
    const supabase = fakeSupabase({ onUpsert: (p) => batchPayloads.push(p as unknown as unknown[]) });
    const f = fakeFetch({ embeddings: [{ values: [0.1, 0.2] }] });
    const n = await indexSource(
      supabase,
      "key",
      { userId: USER_ID, sourceType: "todo", sourceId: "t1", text: "할 일 내용" },
      f,
    );
    expect(n).toBe(1);
    expect(batchPayloads).toHaveLength(1); // 단일 배치 호출
    const rows = batchPayloads[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);          // 청크 1개
    expect(rows[0].content).toBe("할 일 내용");
    expect(rows[0].embedding).toBe("[0.1,0.2]");
  });

  it("임베딩 실패(429) 시 기존 인덱스를 삭제하지 않는다(데이터 유실 방지)", async () => {
    let deleteCalled = false;
    const supabase = fakeSupabase({ onDelete: () => (deleteCalled = true) });
    const f = fakeFetch({ error: "rate" }, false, 429);
    await expect(
      indexSource(
        supabase,
        "key",
        { userId: USER_ID, sourceType: "memo", sourceId: "m1", text: "긴 내용" },
        f,
      ),
    ).rejects.toMatchObject({ code: "quota_exceeded" });
    expect(deleteCalled).toBe(false);
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
