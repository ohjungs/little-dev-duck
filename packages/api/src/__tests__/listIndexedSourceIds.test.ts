import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listIndexedSourceIds } from "../embeddings";

// 2026-07-26 : RAG - 색인목록 - 한페이지상한오판
// 직전 커밋에서 "빠진 것만 색인" 판정을 위해 이 함수를 추가했는데, 한 번에 5000행만 읽었다.
// **행은 소스가 아니라 청크다** — chunkText가 1200자마다 자르므로 긴 페이지 하나가 수십 행이
// 된다. 상한에 걸리면 이미 색인된 소스가 목록에서 빠지고, 호출부는 그걸 "미색인"으로 보고
// **매 세션 재색인**한다(무료 쿼터를 계속 태운다). 내가 낸 회귀라 여기서 못박는다.
//
// unique(user_id, source_type, source_id, chunk_index)가 있으므로 그 순서로 페이지를 넘기면
// 겹치거나 빠지지 않는다.

function pagedSupabase(rows: { source_type: string; source_id: string }[], pageSize: number) {
  const calls: { from: number; to: number }[] = [];
  const chain = {
    select: () => chain,
    order: () => chain,
    range: (from: number, to: number) => {
      calls.push({ from, to });
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
  };
  return {
    client: { from: () => chain } as unknown as SupabaseClient,
    calls,
    pageSize,
  };
}

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ source_type: "page", source_id: `s${i % 50}` }));

describe("listIndexedSourceIds", () => {
  it("한 페이지에 다 들어오면 한 번만 읽는다", async () => {
    const { client, calls } = pagedSupabase(rows(10), 1000);
    const out = await listIndexedSourceIds(client);
    expect(out).toHaveLength(10);
    expect(calls).toHaveLength(1);
  });

  // 이게 회귀의 핵심이다: 예전엔 여기서 잘려 나머지를 "미색인"으로 오판했다.
  it("한 페이지를 넘으면 끝까지 이어서 읽는다", async () => {
    const { client, calls } = pagedSupabase(rows(2500), 1000);
    const out = await listIndexedSourceIds(client);
    expect(out).toHaveLength(2500);
    expect(calls.length).toBeGreaterThan(1);
  });

  it("정확히 페이지 경계로 끝나도 무한 루프가 되지 않는다", async () => {
    const { client, calls } = pagedSupabase(rows(2000), 1000);
    const out = await listIndexedSourceIds(client);
    expect(out).toHaveLength(2000);
    expect(calls.length).toBeLessThan(10);
  });

  it("비어 있으면 빈 배열", async () => {
    const { client } = pagedSupabase([], 1000);
    expect(await listIndexedSourceIds(client)).toEqual([]);
  });

  it("상한을 주면 그 이상 읽지 않는다(폭주 방지)", async () => {
    const { client, calls } = pagedSupabase(rows(50_000), 1000);
    const out = await listIndexedSourceIds(client, 3000);
    expect(out.length).toBeLessThanOrEqual(3000);
    expect(calls.length).toBeLessThanOrEqual(3);
  });
});
