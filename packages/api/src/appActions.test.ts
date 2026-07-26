import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAppActionsAdapter, coerceEventStart, findTodoByTitle } from "./appActions";
// 목에 넣는 db_schema는 **앱이 실제로 만드는 값**이어야 한다. 대충 만든 객체는 `fromRow`의
// zod 검증에 걸려 조용히 null이 되고, 그러면 "이미 데이터베이스" 검사가 헛돈다(실제로 겪었다).
import { createDefaultDbSchema } from "@ldd/core";

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
  it("카탈로그 구성 — 조회는 readonly, 나머지는 전부 mutating(승인 필요)", () => {
    const a = createAppActionsAdapter(mockSupabase({}));
    const names = a.catalog.map((t) => t.name).sort();
    expect(names).toEqual([
      "addCalendarEvent",
      "checkHabit",
      "completeTodo",
      // 2026-07-27 (2차 피드백 2-3): 페이지를 표로. 되돌릴 수 없어 mutating이다.
      "convertPageToDatabase",
      "createMemo",
      "createPage",
      "createTodo",
      // 2026-07-26 (피드백 1-4): 수정·삭제. 파괴적이라 아래 mutating 검사가 특히 중요하다.
      "deleteMemo",
      "deleteTodo",
      "editMemo",
      "editTodo",
      "listCalendarEvents",
      "listHabits",
      "listTodos",
      // 2026-07-26 (피드백 1-4): 집중 타이머. 타이머 자체는 화면이 돌리고 도구는 세션 행만 다룬다.
      "startPomodoro",
      "stopPomodoro",
    ]);
    // 안전 계약: **데이터를 바꾸는 도구는 하나도 빠짐없이 승인 대기여야 한다**(T0-4).
    // 원래 이 테스트는 "전부 mutating"을 못박고 있었는데, 조회 도구가 생기면서 그 문장은
    // 더 이상 성립하지 않는다. 지켜야 할 건 개수가 아니라 이 성질이라 그쪽으로 다시 쓴다.
    for (const tool of a.catalog) {
      const shouldBeReadonly = tool.name.startsWith("list");
      expect(tool.kind, tool.name).toBe(shouldBeReadonly ? "readonly" : "mutating");
    }
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

// ---------------------------------------------------------------------------
// Phase 23 — createTodo 도구의 마감일·반복
// ---------------------------------------------------------------------------
describe("createTodo 마감일·반복 (Phase 23)", () => {
  const TID = "11111111-1111-4111-8111-111111111111";
  const UID = "22222222-2222-4222-8222-222222222222";

  // insert에 실제로 넘어간 payload를 들여다본다.
  function recordingSupabase() {
    const inserts: Record<string, unknown>[] = [];
    const chain = {
      insert: (payload: Record<string, unknown>) => {
        inserts.push(payload);
        return chain;
      },
      select: () => chain,
      single: () =>
        Promise.resolve({
          data: {
            id: TID,
            user_id: UID,
            title: "장보기",
            is_done: false,
            due_date: null,
            recurrence: null,
            created_at: "2026-07-26T00:00:00.000Z",
            updated_at: "2026-07-26T00:00:00.000Z",
          },
          error: null,
        }),
    };
    const client = {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: UID } } }) },
      from: () => chain,
    } as unknown as SupabaseClient;
    return { client, inserts };
  }

  it("마감일을 UTC 자정으로 저장한다", async () => {
    // 할 일 화면은 dueDate.slice(0, 10)으로 오늘을 판정한다. KST 자정으로 저장하면 UTC로는
    // 전날 15:00이라 잘라낸 날짜가 하루 앞선다 — 규약을 여기서 못박는다.
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    const res = await a.execute({
      id: "c1",
      name: "createTodo",
      args: { title: "장보기", dueDate: "2026-07-28" },
    });
    expect(res.response).not.toHaveProperty("error");
    expect(inserts.at(-1)!.due_date).toBe("2026-07-28T00:00:00.000Z");
    expect(String(inserts.at(-1)!.due_date).slice(0, 10)).toBe("2026-07-28");
  });

  it("반복 규칙을 저장한다", async () => {
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    await a.execute({
      id: "c2",
      name: "createTodo",
      args: { title: "회의", recurrence: "FREQ=WEEKLY;BYDAY=TU" },
    });
    expect(inserts.at(-1)!.recurrence).toBe("FREQ=WEEKLY;BYDAY=TU");
  });

  it("제목만 주면 기존과 똑같이 동작한다 (회귀 금지)", async () => {
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    await a.execute({ id: "c3", name: "createTodo", args: { title: "장보기" } });
    expect(inserts.at(-1)!.due_date).toBeNull();
    // recurrence는 값이 있을 때만 payload에 들어간다 — 마이그레이션 적용 전 DB에 그 컬럼이
    // 없어서, null이라도 실어 보내면 할 일 추가 자체가 거부된다.
    expect(Object.keys(inserts.at(-1)!)).not.toContain("recurrence");
  });

  it("모델이 지어낸 반복 문법은 저장하지 않고 오류를 돌려준다", async () => {
    // 조용히 버리면 사용자는 반복이 걸린 줄 안다.
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    const res = await a.execute({
      id: "c4",
      name: "createTodo",
      args: { title: "회의", recurrence: "FREQ=BIWEEKLY" },
    });
    expect(res.response).toHaveProperty("error");
    expect(inserts).toHaveLength(0);
  });

  it("타임스탬프 형식 마감일은 거부한다", async () => {
    // 모델이 시각·타임존을 지어내면 피드백 iter5의 "11일 뒤 일정" 버그가 재발한다.
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    const res = await a.execute({
      id: "c5",
      name: "createTodo",
      args: { title: "장보기", dueDate: "2026-07-28T10:00:00Z" },
    });
    expect(res.response).toHaveProperty("error");
    expect(inserts).toHaveLength(0);
  });

  it("달력에 없는 날짜는 거부한다", async () => {
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    const res = await a.execute({
      id: "c6",
      name: "createTodo",
      args: { title: "장보기", dueDate: "2026-02-30" },
    });
    expect(res.response).toHaveProperty("error");
    expect(inserts).toHaveLength(0);
  });

  it("마감일 없이 반복만 주는 것도 허용한다", async () => {
    // 첫 완료 때 rolloverDueDate가 오늘 기준으로 다음 회차를 잡는다.
    const { client, inserts } = recordingSupabase();
    const a = createAppActionsAdapter(client);
    const res = await a.execute({
      id: "c7",
      name: "createTodo",
      args: { title: "스트레칭", recurrence: "FREQ=DAILY" },
    });
    expect(res.response).not.toHaveProperty("error");
    expect(inserts.at(-1)!.due_date).toBeNull();
    expect(inserts.at(-1)!.recurrence).toBe("FREQ=DAILY");
  });

  it("도구 선언이 마감일·반복을 알린다", async () => {
    const a = createAppActionsAdapter(mockSupabase({}));
    const decl = a.catalog.find((t) => t.name === "createTodo")!;
    const props = decl.parameters.properties as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual(["dueDate", "recurrence", "title"]);
    expect(decl.parameters.required).toEqual(["title"]);
  });
});

// 2026-07-26 : 오리 - 조회도구 - 승인없이자동실행
// 조회 도구는 승인 카드를 띄우면 안 된다(읽기인데 매번 확인을 받으면 대화가 끊긴다).
// 동시에 **쓰기 도구가 실수로 readonly로 새면 승인 없이 데이터가 바뀐다** — 위 카탈로그
// 테스트가 그쪽을 막고, 여기서는 조회가 실제로 값을 돌려주는지 본다.
function todoListSupabase(rows: Record<string, unknown>[]): SupabaseClient {
  // 오리 조회는 조건을 DB로 내린다(duckQueries) — eq/gte/lte 체인이 실제로 호출되므로
  // 목도 그 형태를 그대로 흉내내야 한다. 목이 실제 호출 순서를 모르면 테스트가 구현이 아니라
  // 목을 검사하게 된다(2026-07-26에 습관 목에서 이미 겪었다).
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
  });
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: () => chain,
  } as unknown as SupabaseClient;
}

const TODO_ROW = (id: string, title: string, due: string | null, done = false) => ({
  id,
  user_id: "22222222-2222-4222-8222-222222222222",
  title,
  is_done: done,
  due_date: due,
  created_at: "2026-07-25T00:00:00+00:00",
  updated_at: "2026-07-25T00:00:00+00:00",
});

describe("listTodos 조회 도구", () => {
  it("승인 없이 바로 실행되고 할 일을 돌려준다", async () => {
    const a = createAppActionsAdapter(
      todoListSupabase([
        TODO_ROW("11111111-1111-4111-8111-111111111111", "장보기", null),
        TODO_ROW("11111111-1111-4111-8111-111111111112", "보고서", "2026-07-27T00:00:00+00:00"),
      ]),
    );
    const res = await a.execute({ id: "c1", name: "listTodos", args: {} });
    expect(res.response.error).toBeUndefined();
    const todos = (res.response as { todos: { title: string; dueDate: string | null }[] }).todos;
    expect(todos.map((t) => t.title)).toContain("장보기");
    // 마감일은 오리가 오늘과 비교할 수 있게 날짜만 담는다.
    expect(todos.find((t) => t.title === "보고서")?.dueDate).toBe("2026-07-27");
  });

  it("완료 상태로 거를 수 있다", async () => {
    const a = createAppActionsAdapter(
      todoListSupabase([
        TODO_ROW("11111111-1111-4111-8111-111111111111", "끝난일", null, true),
        TODO_ROW("11111111-1111-4111-8111-111111111112", "남은일", null, false),
      ]),
    );
    const res = await a.execute({ id: "c1", name: "listTodos", args: { status: "notDone" } });
    const todos = (res.response as { todos: { title: string }[] }).todos;
    expect(todos.map((t) => t.title)).toEqual(["남은일"]);
  });

  it("조회 조건이 이상하면 실행하지 않고 오류로 답한다", async () => {
    const a = createAppActionsAdapter(todoListSupabase([]));
    const res = await a.execute({
      id: "c1",
      name: "listTodos",
      args: { status: "무엇이든", dueWithinDays: "일주일" },
    });
    expect(res.response.error).toBeDefined();
  });
});

// 2026-07-26 : 오리 - 앱캘린더조회
// 구글 캘린더 어댑터엔 조회 도구가 있었지만 **앱 자체 캘린더엔 없어서**, 연동하지 않은
// 사용자(기본 상태)의 일정은 오리가 볼 방법이 아예 없었다.
function eventListSupabase(rows: Record<string, unknown>[]): SupabaseClient {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
  });
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: () => chain,
  } as unknown as SupabaseClient;
}

const EVENT_ROW = (id: string, title: string, startAt: string) => ({
  id,
  user_id: "22222222-2222-4222-8222-222222222222",
  title,
  start_at: startAt,
  end_at: null,
  created_at: "2026-07-25T00:00:00+00:00",
  updated_at: "2026-07-25T00:00:00+00:00",
});

describe("listCalendarEvents 조회 도구", () => {
  it("승인 없이 바로 실행되고 앞으로의 일정을 돌려준다", async () => {
    // 로컬 자정 규약(Phase 27)에 맞춰 로컬 시각으로 만든다 — UTC로 만들면 KST에서 전날이 된다.
    const soon = new Date();
    soon.setDate(soon.getDate() + 1);
    soon.setHours(15, 0, 0, 0);
    const a = createAppActionsAdapter(
      eventListSupabase([
        EVENT_ROW("11111111-1111-4111-8111-111111111111", "회의", soon.toISOString()),
      ]),
    );
    const res = await a.execute({ id: "c1", name: "listCalendarEvents", args: {} });
    expect(res.response.error).toBeUndefined();
    const events = (res.response as { events: { title: string }[] }).events;
    expect(events.map((e) => e.title)).toEqual(["회의"]);
  });

  it("지난 일정은 기본으로 빼고, 요청하면 준다", async () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    past.setHours(10, 0, 0, 0);
    const rows = [EVENT_ROW("11111111-1111-4111-8111-111111111112", "지난회의", past.toISOString())];

    const a1 = createAppActionsAdapter(eventListSupabase(rows));
    const hidden = await a1.execute({ id: "c1", name: "listCalendarEvents", args: {} });
    expect((hidden.response as { events: unknown[] }).events).toHaveLength(0);

    const a2 = createAppActionsAdapter(eventListSupabase(rows));
    const shown = await a2.execute({
      id: "c2",
      name: "listCalendarEvents",
      args: { includePast: true },
    });
    expect((shown.response as { events: unknown[] }).events).toHaveLength(1);
  });

  it("조회 조건이 이상하면 실행하지 않고 오류로 답한다", async () => {
    const a = createAppActionsAdapter(eventListSupabase([]));
    const res = await a.execute({
      id: "c1",
      name: "listCalendarEvents",
      args: { withinDays: "일주일" },
    });
    expect(res.response.error).toBeDefined();
  });
});

// 2026-07-26 : 오리 - 습관조회 - 세는질문
// 오리는 습관을 체크할 수는 있는데(checkHabit) 어떻게 하고 있는지는 못 말했다.
// "이번 주 운동 며칠 했어?"는 세는 질문이라 벡터 검색으로는 원리상 못 푼다.
function habitSummarySupabase(
  habits: ReturnType<typeof HABIT_ROW>[],
  checks: Record<string, unknown>[],
): SupabaseClient {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    // 실제 호출 순서를 그대로 흉내낸다 — habits는 select→order→limit,
    // habit_checks는 select→gte→lte→order. 목이 순서를 틀리면 테스트가 구현이 아니라
    // 목을 검사하게 된다.
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const isChecks = table === "habit_checks";
      Object.assign(chain, {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () =>
          isChecks ? Promise.resolve({ data: checks, error: null }) : chain,
        limit: () => Promise.resolve({ data: habits, error: null }),
      });
      return chain;
    },
  } as unknown as SupabaseClient;
}

// id는 habitCheckSchema가 uuid를 요구한다(스키마가 실제로 검증하고 있다는 뜻이라 그대로 맞춘다).
let checkSeq = 0;
const CHECK_ROW = (habitId: string, date: string) => ({
  id: `66666666-6666-4666-8666-${String(checkSeq++).padStart(12, "0")}`,
  habit_id: habitId,
  user_id: "22222222-2222-4222-8222-222222222222",
  checked_date: date,
  created_at: "2026-07-26T00:00:00+00:00",
});

describe("listHabits 조회 도구", () => {
  it("승인 없이 바로 실행되고 습관별 현황을 돌려준다", async () => {
    const HID2 = "44444444-4444-4444-8444-444444444445";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    const a = createAppActionsAdapter(
      habitSummarySupabase(
        [HABIT_ROW(HID2, "아침 운동")],
        [CHECK_ROW(HID2, today)],
      ),
    );
    const res = await a.execute({ id: "c1", name: "listHabits", args: {} });
    expect(res.response.error).toBeUndefined();
    const habits = (res.response as {
      habits: { title: string; checkedToday: boolean; doneInRange: number; rangeDays: number }[];
    }).habits;
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("아침 운동");
    expect(habits[0].checkedToday).toBe(true);
    expect(habits[0].doneInRange).toBe(1);
    // 분모를 함께 줘야 오리가 "7일 중 1일"처럼 말할 수 있다.
    expect(habits[0].rangeDays).toBe(7);
  });

  it("체크가 없는 습관도 빠지지 않는다", async () => {
    const HID3 = "44444444-4444-4444-8444-444444444446";
    const a = createAppActionsAdapter(habitSummarySupabase([HABIT_ROW(HID3, "독서")], []));
    const res = await a.execute({ id: "c1", name: "listHabits", args: {} });
    const habits = (res.response as { habits: { title: string; doneInRange: number }[] }).habits;
    // "요즘 뭐 안 하고 있지?"에 답하려면 0회인 습관이 보여야 한다.
    expect(habits).toEqual([
      expect.objectContaining({ title: "독서", doneInRange: 0 }),
    ]);
  });

  it("조회 조건이 이상하면 실행하지 않고 오류로 답한다", async () => {
    const a = createAppActionsAdapter(habitSummarySupabase([], []));
    const res = await a.execute({ id: "c1", name: "listHabits", args: { rangeDays: "일주일" } });
    expect(res.response.error).toBeDefined();
  });
});

// 2026-07-26 : 오리 수정·삭제 도구 (피드백 1-4)
// 삭제는 되돌리기 UI가 없는 경로다. **애매하면 아무것도 하지 않는다**가 이 도구의 핵심 계약이고,
// 그게 무너지면 사용자가 말하지 않은 항목이 사라진다. 여기서 못박는다.
describe("수정·삭제 도구", () => {
  const rows = [
    { id: "00000001-0000-4000-8000-000000000000", user_id: "00000009-0000-4000-8000-000000000000", title: "장보기", is_done: false, due_date: null, created_at: "2026-07-20T00:00:00.000Z", updated_at: "2026-07-20T00:00:00.000Z" },
    { id: "00000002-0000-4000-8000-000000000000", user_id: "00000009-0000-4000-8000-000000000000", title: "장보기 목록 정리", is_done: false, due_date: null, created_at: "2026-07-20T00:00:00.000Z", updated_at: "2026-07-20T00:00:00.000Z" },
  ];

  /** list는 rows를, update/delete는 호출을 기록만 한다. */
  function listSupabase(list: Record<string, unknown>[], sink: { deleted?: string; updated?: Record<string, unknown> } = {}) {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: list, error: null }),
      eq: (_c: string, v: string) => {
        sink.deleted = v;
        return { ...chain, then: (r: (x: { error: null }) => void) => r({ error: null }) };
      },
      update: (payload: Record<string, unknown>) => {
        sink.updated = payload;
        return {
          eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...list[0], ...payload }, error: null }) }) }),
        };
      },
      delete: () => ({ eq: (_c: string, v: string) => { sink.deleted = v; return Promise.resolve({ error: null }); } }),
    });
    return {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
      from: () => chain,
    } as unknown as SupabaseClient;
  }

  const call = (name: string, args: Record<string, unknown>) => ({ id: "c1", name, args });

  it("지울 대상이 여러 개면 아무것도 지우지 않는다", async () => {
    const sink: { deleted?: string } = {};
    const a = createAppActionsAdapter(listSupabase(rows, sink));
    // "장보"는 두 행에 부분 일치한다 — "아마 이거겠지"는 지우는 일에서 위험하다.
    const r = await a.execute(call("deleteTodo", { title: "장보" }));
    expect(String(r.response.error)).toContain("여러 개");
    expect(sink.deleted).toBeUndefined();
  });

  it("못 찾으면 아무것도 지우지 않는다", async () => {
    const sink: { deleted?: string } = {};
    const a = createAppActionsAdapter(listSupabase(rows, sink));
    const r = await a.execute(call("deleteTodo", { title: "없는할일" }));
    expect(String(r.response.error)).toContain("찾지 못");
    expect(sink.deleted).toBeUndefined();
  });

  it("정확히 일치하는 제목이 있으면 부분 일치보다 그것을 고른다", async () => {
    // "장보기"는 한 행의 제목과 정확히 같고 다른 행에도 부분 일치한다.
    // 정확 일치를 우선하지 않으면 "여러 개"로 막혀 사용자가 지울 방법이 없어진다.
    const sink: { deleted?: string } = {};
    const a = createAppActionsAdapter(listSupabase(rows, sink));
    const r = await a.execute(call("deleteTodo", { title: "장보기" }));
    expect(r.response.deleted).toEqual({ id: rows[0].id, title: "장보기" });
  });

  it("하나로 좁혀지면 그 항목만 지운다", async () => {
    const sink: { deleted?: string } = {};
    const a = createAppActionsAdapter(listSupabase(rows, sink));
    const r = await a.execute(call("deleteTodo", { title: "목록 정리" }));
    expect(sink.deleted).toBe("00000002-0000-4000-8000-000000000000");
    expect(r.response.deleted).toEqual({ id: "00000002-0000-4000-8000-000000000000", title: "장보기 목록 정리" });
  });

  it("바꿀 내용을 안 주면 조용히 성공시키지 않는다", async () => {
    // 아무것도 안 바뀌었는데 성공이라고 하면 사용자는 된 줄 안다.
    const a = createAppActionsAdapter(listSupabase(rows));
    const r = await a.execute(call("editTodo", { title: "목록 정리" }));
    expect(String(r.response.error)).toContain("무엇을 바꿀지");
  });

  it("마감일 형식이 틀리면 조용히 버리지 않고 알린다", async () => {
    const a = createAppActionsAdapter(listSupabase(rows));
    const r = await a.execute(call("editTodo", { title: "목록 정리", dueDate: "내일쯤" }));
    expect(String(r.response.error)).toContain("형식");
  });

  it("빈 마감일은 '마감 없앰'으로 처리한다", async () => {
    const sink: { updated?: Record<string, unknown> } = {};
    const a = createAppActionsAdapter(listSupabase(rows, sink));
    await a.execute(call("editTodo", { title: "목록 정리", dueDate: "" }));
    expect(sink.updated).toHaveProperty("due_date", null);
  });

  it("제목만 바꾸면 마감일 키를 건드리지 않는다", async () => {
    const sink: { updated?: Record<string, unknown> } = {};
    const a = createAppActionsAdapter(listSupabase(rows, sink));
    await a.execute(call("editTodo", { title: "목록 정리", newTitle: "새 제목" }));
    expect(sink.updated).toHaveProperty("title", "새 제목");
    expect(sink.updated).not.toHaveProperty("due_date");
  });

  it("메모 삭제도 애매하면 멈춘다", async () => {
    const memos = [
      { id: "00000003-0000-4000-8000-000000000000", user_id: "00000009-0000-4000-8000-000000000000", title: "회의", content: "회의 메모", created_at: "2026-07-20T00:00:00.000Z", updated_at: "2026-07-20T00:00:00.000Z" },
      { id: "00000004-0000-4000-8000-000000000000", user_id: "00000009-0000-4000-8000-000000000000", title: "회의록", content: "회의록", created_at: "2026-07-20T00:00:00.000Z", updated_at: "2026-07-20T00:00:00.000Z" },
    ];
    const sink: { deleted?: string } = {};
    const a = createAppActionsAdapter(listSupabase(memos, sink));
    const r = await a.execute(call("deleteMemo", { title: "회" }));
    expect(String(r.response.error)).toContain("여러 개");
    expect(sink.deleted).toBeUndefined();
  });
});

// 2026-07-26 : 오리 뽀모도로 (피드백 1-4)
// 타이머 자체는 화면이 돌린다. 도구가 지켜야 할 건 **세션이 둘 이상 동시에 열리지 않는 것**과
// **없는 걸 끝냈다고 하지 않는 것**이다.
describe("뽀모도로 도구", () => {
  const NOW = Date.now();
  const running = {
    id: "66666666-6666-4666-8666-666666666666",
    user_id: "22222222-2222-4222-8222-222222222222",
    duration_minutes: 25,
    tag: null,
    started_at: new Date(NOW - 60_000).toISOString(),
    completed_at: null,
    created_at: new Date(NOW - 60_000).toISOString(),
  };

  function pomodoroSupabase(sessions: Record<string, unknown>[], sink: { inserted?: Record<string, unknown>; updated?: boolean } = {}) {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      order: () => chain,
      eq: () => chain,
      is: () => chain,
      limit: () => Promise.resolve({ data: sessions, error: null }),
      maybeSingle: () => {
        sink.updated = true;
        return Promise.resolve({ data: { ...running, completed_at: new Date().toISOString() }, error: null });
      },
      // 삽입 payload를 반환 행에 통째로 섞지 않는다 — 목의 user_id는 uuid가 아니라 검증에 걸린다.
      // 실제 서버는 저장된 행을 다시 돌려주므로 여기서도 그걸 흉내 낸다.
      single: () =>
        Promise.resolve({
          data: {
            ...running,
            duration_minutes:
              (sink.inserted?.duration_minutes as number | undefined) ?? running.duration_minutes,
            completed_at: null,
          },
          error: null,
        }),
      insert: (payload: Record<string, unknown>) => {
        sink.inserted = payload;
        return chain;
      },
      update: () => chain,
    });
    return {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
      rpc: () => Promise.resolve({ data: null, error: null }),
      from: () => chain,
    } as unknown as SupabaseClient;
  }

  const exec = (name: string, args: Record<string, unknown> = {}) => ({ id: "c1", name, args });

  it("이미 돌고 있으면 새로 시작하지 않는다", async () => {
    // 두 세션이 동시에 열리면 어느 쪽이 끝날지 알 수 없다.
    const sink: { inserted?: Record<string, unknown> } = {};
    const a = createAppActionsAdapter(pomodoroSupabase([running], sink));
    const r = await a.execute(exec("startPomodoro", { durationMinutes: 25 }));
    expect(String(r.response.error)).toContain("이미");
    expect(sink.inserted).toBeUndefined();
  });

  it("분을 말하지 않으면 25분으로 시작한다", async () => {
    const sink: { inserted?: Record<string, unknown> } = {};
    const a = createAppActionsAdapter(pomodoroSupabase([], sink));
    await a.execute(exec("startPomodoro"));
    expect(sink.inserted?.duration_minutes).toBe(25);
  });

  it("범위를 벗어난 시간은 저장 전에 막는다", async () => {
    // DB CHECK(1~180)에 걸리면 사용자는 이유 없는 실패를 본다.
    const a = createAppActionsAdapter(pomodoroSupabase([]));
    for (const bad of [0, -5, 999]) {
      const r = await a.execute(exec("startPomodoro", { durationMinutes: bad }));
      expect(String(r.response.error), String(bad)).toContain("1~180");
    }
  });

  it("모델이 문자열로 줘도 숫자로 받는다", async () => {
    const sink: { inserted?: Record<string, unknown> } = {};
    const a = createAppActionsAdapter(pomodoroSupabase([], sink));
    await a.execute(exec("startPomodoro", { durationMinutes: "30" }));
    expect(sink.inserted?.duration_minutes).toBe(30);
  });

  it("돌고 있지 않은데 중지하면 그렇게 말한다", async () => {
    // 아무것도 안 끝냈는데 "끝냈다"고 하면 사용자는 된 줄 안다.
    const a = createAppActionsAdapter(pomodoroSupabase([]));
    const r = await a.execute(exec("stopPomodoro"));
    expect(String(r.response.error)).toContain("없어요");
  });

  it("돌고 있으면 그 세션을 끝낸다", async () => {
    const sink: { updated?: boolean } = {};
    const a = createAppActionsAdapter(pomodoroSupabase([running], sink));
    const r = await a.execute(exec("stopPomodoro"));
    expect(sink.updated).toBe(true);
    expect(r.response.stopped).toMatchObject({ id: running.id });
  });
});

// 2026-07-27 : 오리도구 - 페이지를 표로 (2차 피드백 2-3, Phase 43 T2)
// 사용자 요청: "데이터베이스로 전환은 왜 필요한지 모르겠고 **오리한테 시켜서** 할 수 있거나…".
// 도구 모음에서 버튼을 빼는 대신 오리에게 옮긴다 — **지우면 표를 만들 길이 사라진다**
// (DatabaseView 638줄과 Phase 33의 열 집계가 전부 그 입구에 매달려 있다).
//
// **이 변환은 화면에서 되돌릴 수 없다**(실측: `dbSchema`를 null로 되돌리는 자리가 코드에 없다).
// 그래서 `kind: "mutating"` — 승인 카드 없이는 실행되지 않는다. 그 성질을 여기서 잠근다.
// `fromRow`가 `pageSchema.parse`를 거치므로 목도 **실제 행 모양**이어야 한다
// (uuid·타임스탬프까지). 대충 만든 목은 통과해도 실제와 다른 걸 검사하게 된다.
function pageRow(n: number, title: string, dbSchema?: unknown) {
  const id = `00000000-0000-4000-8000-00000000000${n}`;
  return {
    id,
    user_id: "00000000-0000-4000-8000-0000000000ff",
    parent_id: null,
    title,
    content: null,
    plain_text: "",
    icon: null,
    is_trashed: false,
    trashed_at: null,
    created_at: "2026-07-27T00:00:00.000Z",
    updated_at: "2026-07-27T00:00:00.000Z",
    db_schema: dbSchema ?? null,
    row_props: {},
    is_public: false,
    public_slug: null,
    cover_url: null,
  };
}

function mockPagesSupabase(pages: ReturnType<typeof pageRow>[]) {
  const updated: { id?: string; patch?: Record<string, unknown> } = {};
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    order: () => chain,
    // 실제 listPages는 order 뒤에 limit로 끝난다 — 목이 체인을 빠뜨리면 검사가 헛돈다.
    limit: () => Promise.resolve({ data: pages, error: null }),
    update: (patch: Record<string, unknown>) => {
      updated.patch = patch;
      return {
        eq: (_col: string, id: string) => {
          updated.id = id;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { ...pages.find((p) => p.id === id), ...patch },
                  error: null,
                }),
            }),
          };
        },
      };
    },
  };
  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: () => chain,
  } as unknown as SupabaseClient;
  return { client, updated };
}

describe("convertPageToDatabase 액션", () => {
  const call = (title: string) => ({
    id: "c1",
    name: "convertPageToDatabase",
    args: { title },
  });

  it("되돌릴 수 없는 변환이라 승인이 필요한 도구다", () => {
    const a = createAppActionsAdapter(mockPagesSupabase([]).client);
    const decl = a.catalog.find((t) => t.name === "convertPageToDatabase");
    expect(decl, "도구가 카탈로그에 없다").toBeDefined();
    expect(decl!.kind).toBe("mutating");
    // 되돌릴 수 없다는 사실이 설명에 있어야 승인 카드를 보는 사용자가 판단할 수 있다.
    expect(decl!.description).toContain("되돌");
  });

  it("제목으로 찾아 데이터베이스로 바꾼다", async () => {
    const { client, updated } = mockPagesSupabase([
      pageRow(1, "회의록"),
      pageRow(2, "일기"),
    ]);
    const a = createAppActionsAdapter(client);
    const res = await a.execute(call("회의록"));
    // 오류는 `response.error`에 담긴다(errorResult) — 성공이면 그 자리가 비어 있다.
    expect(res.response?.error).toBeUndefined();
    expect(updated.id).toBe(pageRow(1, "회의록").id);
    // 기본 스키마로 만든다 — 전환 로직을 새로 짜지 않고 core의 것을 그대로 쓴다.
    expect(updated.patch?.db_schema).toBeTruthy();
  });

  it("이미 데이터베이스인 페이지는 다시 바꾸지 않는다", async () => {
    // 다시 바꾸면 사용자가 만든 열·뷰가 기본값으로 덮여 사라진다.
    const { client, updated } = mockPagesSupabase([
      pageRow(1, "트래커", createDefaultDbSchema()),
    ]);
    const a = createAppActionsAdapter(client);
    const res = await a.execute(call("트래커"));
    expect(res.response?.error).toBeTruthy();
    expect(updated.id, "쓰기가 일어나면 안 된다").toBeUndefined();
  });

  it("여러 개가 걸리면 실행하지 않고 되묻는다", async () => {
    const { client, updated } = mockPagesSupabase([
      pageRow(1, "회의록 7월"),
      pageRow(2, "회의록 8월"),
    ]);
    const a = createAppActionsAdapter(client);
    const res = await a.execute(call("회의록"));
    expect(String(res.response?.error)).toContain("여러");
    expect(updated.id).toBeUndefined();
  });

  it("못 찾으면 조용히 성공하지 않는다", async () => {
    const { client } = mockPagesSupabase([pageRow(1, "일기")]);
    const a = createAppActionsAdapter(client);
    const res = await a.execute(call("없는 페이지"));
    expect(res.response?.error).toBeTruthy();
  });
});
