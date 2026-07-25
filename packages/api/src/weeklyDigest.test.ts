import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWeeklyDigest } from "./standup";

const RANGE = { start: "2026-07-13", end: "2026-07-19" };

// 테이블별 응답을 지정하는 최소 fake. pages는 중복 검사(select.eq.eq.limit) 경로를 탄다.
function fake(opts: {
  existingDigest?: boolean;
  todos?: { is_done: boolean }[];
  captureRange?: (t: string, since: string, until?: string) => void;
}): SupabaseClient {
  const rowsFor = (table: string) =>
    table === "todos" ? (opts.todos ?? []) : [];

  return {
    from(table: string) {
      let since = "";
      let until: string | undefined;
      const result = {
        data:
          table === "pages" && opts.existingDigest ? [{ id: "dup" }] : rowsFor(table),
        error: null,
      };
      const builder = {
        select: () => builder,
        eq: () => builder,
        not: () => builder,
        gte: (_c: string, v: string) => {
          since = v;
          return builder;
        },
        lte: (_c: string, v: string) => {
          until = v;
          opts.captureRange?.(table, since, until);
          return builder;
        },
        limit: async () => result,
        then: (resolve: (v: typeof result) => void) => {
          opts.captureRange?.(table, since, until);
          return resolve(result);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe("generateWeeklyDigest", () => {
  it("같은 제목 다이제스트가 이미 있으면 만들지 않는다(기기 간 중복 방지)", async () => {
    const result = await generateWeeklyDigest(
      fake({ existingDigest: true, todos: [{ is_done: true }] }),
      RANGE,
    );
    expect(result).toBeNull();
  });

  it("활동이 전혀 없으면 만들지 않는다", async () => {
    expect(await generateWeeklyDigest(fake({ todos: [] }), RANGE)).toBeNull();
  });

  it("활동이 있으면 제목과 본문 줄을 돌려준다", async () => {
    const result = await generateWeeklyDigest(
      fake({ todos: [{ is_done: true }, { is_done: false }] }),
      RANGE,
    );
    expect(result).not.toBeNull();
    expect(result!.title).toContain("2026-07-13");
    expect(result!.lines.join("\n")).toContain("2개 중 1개 완료");
  });

  it("조회 구간이 지난 주 로컬 자정~자정에 맞는다(UTC로 밀리지 않게)", async () => {
    const seen: Record<string, { since: string; until?: string }> = {};
    await generateWeeklyDigest(
      fake({
        todos: [{ is_done: true }],
        captureRange: (t, since, until) => {
          seen[t] = { since, until };
        },
      }),
      RANGE,
    );
    // 로컬 자정을 ISO로 바꾼 값과 일치해야 한다 — 타임존과 무관하게 성립하는 비교
    expect(seen.todos.since).toBe(new Date(2026, 6, 13).toISOString());
    expect(seen.todos.until).toBe(
      new Date(2026, 6, 19, 23, 59, 59, 999).toISOString(),
    );
  });
});
