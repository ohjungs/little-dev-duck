import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listUnsummarizedArticles } from "../news";

// 2026-07-26 : 뉴스 - 요약대상 - 창밖은영영안됨
// 수집 라우트는 `listArticles(supabase, 100)`으로 **최신 100개만** 가져온 뒤 summary가 null인
// 것을 걸러 요약했다. 수집이 요약(1회 8개)보다 빠르면 요약 안 된 기사가 그 창 밖으로 밀려나고,
// **그 뒤로는 영영 요약되지 않는다.** 재색인에서 겪은 것과 같은 구조다.
//
// 창을 넓히는 대신 **요약 대상만 직접 조회**한다 — DB가 걸러주므로 창 개념 자체가 사라진다.

function articleRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
    user_id: "22222222-2222-4222-8222-222222222222",
    feed_id: "33333333-3333-4333-8333-333333333333",
    url_hash: `hash${i}`,
    title: `기사 ${i}`,
    link: `https://example.com/${i}`,
    snippet: "요약문",
    summary: null,
    published_at: "2026-07-20T00:00:00+00:00",
    created_at: "2026-07-20T00:00:00+00:00",
  }));
}

function mockSupabase(rows: unknown[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: (...a: unknown[]) => {
      calls.push({ method: "select", args: a });
      return chain;
    },
    is: (...a: unknown[]) => {
      calls.push({ method: "is", args: a });
      return chain;
    },
    order: (...a: unknown[]) => {
      calls.push({ method: "order", args: a });
      return chain;
    },
    limit: (...a: unknown[]) => {
      calls.push({ method: "limit", args: a });
      return Promise.resolve({ data: rows, error: null });
    },
  });
  return { client: { from: () => chain } as unknown as SupabaseClient, calls };
}

describe("listUnsummarizedArticles", () => {
  it("요약이 없는 기사만 DB에서 직접 고른다", async () => {
    const { client, calls } = mockSupabase(articleRows(3));
    const out = await listUnsummarizedArticles(client, 8);
    expect(out).toHaveLength(3);
    // 최신 N개를 가져와 앱에서 거르는 게 아니라, DB가 걸러야 창 밖 기사도 잡힌다.
    expect(calls.some((c) => c.method === "is" && c.args[0] === "summary")).toBe(true);
  });

  it("요청한 개수만큼만 가져온다(무료 쿼터 보호)", async () => {
    const { client, calls } = mockSupabase(articleRows(8));
    await listUnsummarizedArticles(client, 8);
    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(8);
  });

  it("오래된 것부터 처리한다 — 밀린 기사가 계속 뒤로 밀리지 않게", async () => {
    const { client, calls } = mockSupabase(articleRows(2));
    await listUnsummarizedArticles(client, 8);
    const order = calls.find((c) => c.method === "order");
    expect(order?.args[0]).toBe("created_at");
    expect(order?.args[1]).toMatchObject({ ascending: true });
  });

  it("없으면 빈 배열", async () => {
    const { client } = mockSupabase([]);
    expect(await listUnsummarizedArticles(client, 8)).toEqual([]);
  });

  it("조회 실패는 에러로 던진다(조용히 빈 결과로 삼키지 않는다)", async () => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      is: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    });
    const client = { from: () => chain } as unknown as SupabaseClient;
    await expect(listUnsummarizedArticles(client, 8)).rejects.toThrow("boom");
  });
});
