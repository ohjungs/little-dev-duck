import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listTodosForDuck, listEventsForDuck } from "../duckQueries";

// 2026-07-26 : 오리 조회 - 고정창 - 창밖은영영안보임
// 이 세션에서 같은 부류를 세 번 고쳤다(재색인 상한·색인목록 페이지·뉴스 요약 창).
// 훑다가 네 번째를 찾았다: 오리의 조회 도구가 쓰는 원본 질의에 limit(500)이 있고, 거르기는
// **앱에서** 한다.
//   - listTodos: created_at 내림차순 500 → 오래된 할 일이 창 밖. 2년 전에 만든 항목의
//     마감이 이번 주여도 오리가 못 본다.
//   - listCalendarEvents: start_at **오름차순** 500 → 과거 일정이 창을 채우면
//     **다가올 일정이 아예 안 들어온다**(더 나쁜 쪽).
//
// 공유 함수의 기본 동작을 바꾸면 위젯(같은 함수를 쓴다)이 과거 일정을 못 보게 될 수 있어
// 위험하다. 그래서 **오리 경로 전용 질의**를 따로 두고 조건을 DB로 내린다.

type Call = { method: string; args: unknown[] };

function mockSupabase(rows: unknown[]) {
  const calls: Call[] = [];
  const chain: Record<string, unknown> = {};
  const rec = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    return chain;
  };
  Object.assign(chain, {
    select: rec("select"),
    eq: rec("eq"),
    gte: rec("gte"),
    lte: rec("lte"),
    order: rec("order"),
    limit: (...args: unknown[]) => {
      calls.push({ method: "limit", args });
      return Promise.resolve({ data: rows, error: null });
    },
  });
  return { client: { from: () => chain } as unknown as SupabaseClient, calls };
}

const todoRow = (i: number, due: string | null) => ({
  id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
  user_id: "22222222-2222-4222-8222-222222222222",
  title: `할일 ${i}`,
  is_done: false,
  due_date: due,
  recurrence: null,
  created_at: "2026-07-01T00:00:00+00:00",
  updated_at: "2026-07-01T00:00:00+00:00",
});

const eventRow = (i: number, startAt: string) => ({
  id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
  user_id: "22222222-2222-4222-8222-222222222222",
  title: `일정 ${i}`,
  start_at: startAt,
  end_at: null,
  created_at: "2026-07-01T00:00:00+00:00",
  updated_at: "2026-07-01T00:00:00+00:00",
});

const argOf = (calls: Call[], method: string, i = 0) =>
  calls.filter((c) => c.method === method)[i]?.args;

describe("listTodosForDuck", () => {
  it("마감 조건을 DB로 내린다(앱에서 거르지 않는다)", async () => {
    const { client, calls } = mockSupabase([todoRow(0, "2026-07-27T00:00:00+00:00")]);
    await listTodosForDuck(client, { dueWithinDays: 7 }, "2026-07-26");
    // 상한이 걸린 창을 받아 앱에서 거르면 창 밖 항목을 영영 못 본다.
    expect(calls.some((c) => c.method === "lte" && c.args[0] === "due_date")).toBe(true);
  });

  it("지난 마감도 포함하도록 하한을 걸지 않는다", async () => {
    const { client, calls } = mockSupabase([]);
    await listTodosForDuck(client, { dueWithinDays: 7 }, "2026-07-26");
    // "이번 주 마감"에서 이미 지난 것이 가장 급하다 — gte로 잘라내면 안 된다.
    expect(calls.some((c) => c.method === "gte" && c.args[0] === "due_date")).toBe(false);
  });

  it("완료 상태 조건도 DB로 내린다", async () => {
    const { client, calls } = mockSupabase([]);
    await listTodosForDuck(client, { status: "notDone" }, "2026-07-26");
    expect(argOf(calls, "eq")).toEqual(["is_done", false]);
  });

  it("조건이 없으면 상태·마감 필터를 걸지 않는다", async () => {
    const { client, calls } = mockSupabase([]);
    await listTodosForDuck(client, {}, "2026-07-26");
    expect(calls.some((c) => c.method === "eq" || c.method === "lte")).toBe(false);
  });

  it("결과 개수에 상한을 둔다(오리 컨텍스트·쿼터 보호)", async () => {
    const { client, calls } = mockSupabase([]);
    await listTodosForDuck(client, {}, "2026-07-26");
    expect(typeof argOf(calls, "limit")?.[0]).toBe("number");
  });
});

describe("listEventsForDuck", () => {
  it("기본은 오늘 이후만 — 과거가 창을 채우지 못하게 DB에서 자른다", async () => {
    const { client, calls } = mockSupabase([eventRow(0, "2026-07-27T09:00:00+09:00")]);
    await listEventsForDuck(client, {}, "2026-07-26");
    expect(calls.some((c) => c.method === "gte" && c.args[0] === "start_at")).toBe(true);
  });

  it("지난 일정을 요청하면 하한을 풀어준다", async () => {
    const { client, calls } = mockSupabase([]);
    await listEventsForDuck(client, { includePast: true }, "2026-07-26");
    expect(calls.some((c) => c.method === "gte" && c.args[0] === "start_at")).toBe(false);
  });

  it("범위를 주면 상한도 DB로 내린다", async () => {
    const { client, calls } = mockSupabase([]);
    await listEventsForDuck(client, { withinDays: 7 }, "2026-07-26");
    expect(calls.some((c) => c.method === "lte" && c.args[0] === "start_at")).toBe(true);
  });

  it("빠른 시각 순으로 가져온다", async () => {
    const { client, calls } = mockSupabase([]);
    await listEventsForDuck(client, {}, "2026-07-26");
    expect(argOf(calls, "order")).toEqual(["start_at", { ascending: true }]);
  });

  it("조회 실패는 에러로 던진다", async () => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    });
    const client = { from: () => chain } as unknown as SupabaseClient;
    await expect(listEventsForDuck(client, {}, "2026-07-26")).rejects.toThrow("boom");
  });
});
