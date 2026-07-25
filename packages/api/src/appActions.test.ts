import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAppActionsAdapter, coerceEventStart, findTodoByTitle } from "./appActions";

// createTodo/createMemo는 supabase.auth.getUser + from().insert().select().single() 체인을 쓴다.
// 최소 목으로 성공/검증 경로를 확인한다(외부 호출 0).
function mockSupabase(insertedRow: Record<string, unknown>): SupabaseClient {
  const chain = {
    insert: () => chain,
    select: () => chain,
    single: () => Promise.resolve({ data: insertedRow, error: null }),
  };
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: () => chain,
  } as unknown as SupabaseClient;
}

describe("createAppActionsAdapter", () => {
  it("카탈로그에 생성·완료 도구가 있고 전부 mutating(승인 필요)", () => {
    const a = createAppActionsAdapter(mockSupabase({}));
    const names = a.catalog.map((t) => t.name).sort();
    expect(names).toEqual([
      "addCalendarEvent",
      "checkHabit",
      "completeTodo",
      "createMemo",
      "createPage",
      "createTodo",
    ]);
    expect(a.catalog.every((t) => t.kind === "mutating")).toBe(true);
  });

  it("createTodo 실행 시 할 일을 만들고 결과를 되돌린다", async () => {
    const TID = "11111111-1111-4111-8111-111111111111";
    const UID = "22222222-2222-4222-8222-222222222222";
    const a = createAppActionsAdapter(
      mockSupabase({
        id: TID,
        user_id: UID,
        title: "장보기",
        is_done: false,
        due_date: null,
        created_at: "2026-07-25T00:00:00+00:00",
        updated_at: "2026-07-25T00:00:00+00:00",
      }),
    );
    const res = await a.execute({ id: "c1", name: "createTodo", args: { title: "장보기" } });
    expect(res.response.error).toBeUndefined();
    expect(res.response.created).toMatchObject({ id: TID, title: "장보기" });
  });

  it("빈 제목은 검증 실패로 에러 결과를 반환(실행 안 함)", async () => {
    const a = createAppActionsAdapter(mockSupabase({}));
    const res = await a.execute({ id: "c2", name: "createTodo", args: { title: "" } });
    expect(res.response.error).toBeDefined();
  });

  it("알 수 없는 도구는 에러 결과", async () => {
    const a = createAppActionsAdapter(mockSupabase({}));
    const res = await a.execute({ id: "c3", name: "deleteEverything", args: {} });
    expect(res.response.error).toBeDefined();
  });
});

describe("coerceEventStart", () => {
  it("offset 포함 ISO는 그대로 둔다", () => {
    expect(coerceEventStart("2026-07-26T10:00:00+09:00")).toBe("2026-07-26T10:00:00+09:00");
  });
  it("날짜만 주면 KST 자정으로 보정", () => {
    expect(coerceEventStart("2026-07-26")).toBe("2026-07-26T00:00:00+09:00");
  });
  it("offset 없는 시각은 KST로 간주", () => {
    expect(coerceEventStart("2026-07-26T14:30")).toBe("2026-07-26T14:30:00+09:00");
  });
  it("파싱 불가는 null", () => {
    expect(coerceEventStart("내일쯤")).toBeNull();
  });
});

describe("findTodoByTitle", () => {
  const todos = [
    { id: "1", title: "장보기" },
    { id: "2", title: "자격증 공부하기" },
    { id: "3", title: "지원서 쓰기" },
  ];
  it("정확 일치(대소문자 무시)를 우선한다", () => {
    expect(findTodoByTitle(todos, "장보기")).toMatchObject({ id: "1" });
  });
  it("정확 일치가 없으면 부분일치 1건을 고른다", () => {
    expect(findTodoByTitle(todos, "자격증")).toMatchObject({ id: "2" });
  });
  it("부분일치가 여러 개면 ambiguous", () => {
    const many = [{ id: "a", title: "회의 준비" }, { id: "b", title: "회의록 작성" }];
    expect(findTodoByTitle(many, "회의")).toBe("ambiguous");
  });
  it("없으면 null", () => {
    expect(findTodoByTitle(todos, "없는할일")).toBeNull();
    expect(findTodoByTitle(todos, "  ")).toBeNull();
  });
});


// Phase 19 T1: 습관 체크 액션. listHabits(select→order→limit)와 checkHabit(insert→select→single)을
// 한 목에서 태워야 해서 전용 목을 쓴다.
const HABIT_ROW = (id: string, title: string) => ({
  id,
  user_id: "22222222-2222-4222-8222-222222222222",
  title,
  frequency: "daily" as const,
  times_per_week: null,
  created_at: "2026-07-25T00:00:00+00:00",
  updated_at: "2026-07-25T00:00:00+00:00",
});

function habitSupabase(opts: {
  habits: ReturnType<typeof HABIT_ROW>[];
  insertError?: string;
  onInsert?: (payload: Record<string, unknown>) => void;
}): SupabaseClient {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: opts.habits, error: null }),
        insert: (payload: Record<string, unknown>) => {
          if (table === "habit_checks") opts.onInsert?.(payload);
          return chain;
        },
        single: () =>
          Promise.resolve(
            opts.insertError
              ? { data: null, error: { message: opts.insertError } }
              : {
                  data: {
                    id: "33333333-3333-4333-8333-333333333333",
                    habit_id: opts.habits[0]?.id,
                    user_id: "22222222-2222-4222-8222-222222222222",
                    checked_date: "2026-07-26",
                    created_at: "2026-07-26T00:00:00+00:00",
                  },
                  error: null,
                },
          ),
      });
      return chain;
    },
  } as unknown as SupabaseClient;
}

const HID = "44444444-4444-4444-8444-444444444444";
const call = (title: string) => ({ id: "c1", name: "checkHabit", args: { title } });

describe("checkHabit 액션", () => {
  it("제목으로 습관을 찾아 오늘 체크한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const a = createAppActionsAdapter(
      habitSupabase({
        habits: [HABIT_ROW(HID, "아침 운동")],
        onInsert: (p) => {
          captured = p;
        },
      }),
    );
    const res = await a.execute(call("운동"));
    expect(res.response).toMatchObject({ checked: { title: "아침 운동" } });
    expect(captured?.habit_id).toBe(HID);
    // 서버가 UTC여도 KST 기준 날짜여야 한다
    expect(String(captured?.checked_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("이미 오늘 체크된 습관이면 에러가 아니라 '이미 체크됨'으로 답한다(멱등)", async () => {
    const a = createAppActionsAdapter(
      habitSupabase({
        habits: [HABIT_ROW(HID, "아침 운동")],
        insertError: 'duplicate key value violates unique constraint (23505)',
      }),
    );
    const res = await a.execute(call("아침 운동"));
    expect(res.response).toMatchObject({ alreadyChecked: { title: "아침 운동" } });
    expect(res.response).not.toHaveProperty("error");
  });

  it("여러 개 일치하면 아무것도 바꾸지 않고 되묻는다", async () => {
    let inserted = false;
    const a = createAppActionsAdapter(
      habitSupabase({
        habits: [HABIT_ROW(HID, "아침 운동"), HABIT_ROW("55555555-5555-4555-8555-555555555555", "저녁 운동")],
        onInsert: () => {
          inserted = true;
        },
      }),
    );
    const res = await a.execute(call("운동"));
    expect(String((res.response as { error?: string }).error)).toContain("여러 개");
    expect(inserted).toBe(false);
  });

  it("못 찾으면 아무것도 바꾸지 않는다", async () => {
    let inserted = false;
    const a = createAppActionsAdapter(
      habitSupabase({
        habits: [HABIT_ROW(HID, "아침 운동")],
        onInsert: () => {
          inserted = true;
        },
      }),
    );
    const res = await a.execute(call("명상"));
    expect((res.response as { error?: string }).error).toBeTruthy();
    expect(inserted).toBe(false);
  });

  it("빈 제목은 실행 전에 막는다", async () => {
    const a = createAppActionsAdapter(habitSupabase({ habits: [HABIT_ROW(HID, "아침 운동")] }));
    const res = await a.execute({ id: "c1", name: "checkHabit", args: { title: "" } });
    expect((res.response as { error?: string }).error).toBeTruthy();
  });

  it("체크 도구도 mutating이라 승인 게이트를 탄다", () => {
    const a = createAppActionsAdapter(habitSupabase({ habits: [] }));
    expect(a.catalog.find((t) => t.name === "checkHabit")?.kind).toBe("mutating");
  });
});
