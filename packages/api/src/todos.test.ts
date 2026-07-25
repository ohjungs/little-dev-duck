import { describe, expect, it } from "vitest";
import { createTodo, deleteTodo, listTodos, updateTodo } from "./todos";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "우유 사기",
  is_done: false,
  due_date: null,
  created_at: "2026-07-20T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: VALID_ROW.user_id } },
      }),
    },
    from: () => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [VALID_ROW], error: null }) }),
        // updateTodo가 완료 시 반복 여부를 확인하려고 단건 조회를 한다. 실제
        // supabase-js는 select에 이 체인이 항상 붙어 있으므로 가짜도 맞춰 둔다.
        eq: () => ({ single: async () => ({ data: VALID_ROW, error: null }) }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: VALID_ROW, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: VALID_ROW, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// 반복 할 일 검증용 — update에 실제로 넘어간 payload와 select 호출 횟수를 들여다본다.
function recordingSupabase(row: Record<string, unknown>) {
  const updates: Record<string, unknown>[] = [];
  let reads = 0;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
    },
    from: () => ({
      select: (columns?: string) => {
        // listTodos는 인자 없이, 반복 조회는 컬럼을 지정해서 부른다.
        if (columns) reads += 1;
        return {
          order: () => ({ limit: async () => ({ data: [row], error: null }) }),
          eq: () => ({ single: async () => ({ data: row, error: null }) }),
        };
      },
      insert: (payload: Record<string, unknown>) => {
        updates.push(payload);
        return {
          select: () => ({ single: async () => ({ data: row, error: null }) }),
        };
      },
      update: (payload: Record<string, unknown>) => {
        updates.push(payload);
        return {
          eq: () => ({
            select: () => ({ single: async () => ({ data: row, error: null }) }),
          }),
        };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, updates, reads: () => reads };
}

describe("반복 할 일 완료 (Phase 20 T3)", () => {
  const recurringRow = {
    ...VALID_ROW,
    recurrence: "FREQ=WEEKLY;BYDAY=TU",
    due_date: "2026-07-28T00:00:00.000Z",
  };

  it("완료하면 사라지지 않고 다음 회차로 마감일이 옮겨간다", async () => {
    const { client, updates } = recordingSupabase(recurringRow);
    await updateTodo(client, VALID_ROW.id, { isDone: true });

    const patch = updates.at(-1)!;
    // 완료로 닫아버리면 다음 주에 다시 나타나지 않는다 — 미완료로 두고 날짜만 민다.
    expect(patch.is_done).toBe(false);
    expect(patch.due_date).toBe("2026-08-04T00:00:00.000Z");
  });

  it("반복이 없는 할 일의 완료 동작은 그대로다 (회귀 금지)", async () => {
    const { client, updates } = recordingSupabase({ ...VALID_ROW, recurrence: null });
    await updateTodo(client, VALID_ROW.id, { isDone: true });

    const patch = updates.at(-1)!;
    expect(patch.is_done).toBe(true);
    expect(patch.due_date).toBeUndefined();
  });

  it("완료 해제는 반복을 조회하지 않는다 (불필요한 쿼리 금지)", async () => {
    const { client, reads } = recordingSupabase(recurringRow);
    await updateTodo(client, VALID_ROW.id, { isDone: false });
    expect(reads()).toBe(0);
  });

  it("제목만 고칠 때도 반복을 조회하지 않는다", async () => {
    const { client, reads } = recordingSupabase(recurringRow);
    await updateTodo(client, VALID_ROW.id, { title: "새 제목" });
    expect(reads()).toBe(0);
  });

  it("규칙이 깨져 있으면 평소대로 완료된다", async () => {
    const { client, updates } = recordingSupabase({
      ...recurringRow,
      recurrence: "FREQ=NOPE",
    });
    await updateTodo(client, VALID_ROW.id, { isDone: true });
    expect(updates.at(-1)!.is_done).toBe(true);
  });

  it("createTodo가 반복 규칙을 저장한다", async () => {
    const { client, updates } = recordingSupabase(recurringRow);
    await createTodo(client, { title: "회의", recurrence: "FREQ=WEEKLY;BYDAY=TU" });
    expect(updates.at(-1)!.recurrence).toBe("FREQ=WEEKLY;BYDAY=TU");
  });

  it("createTodo에 반복이 없으면 null로 저장한다", async () => {
    const { client, updates } = recordingSupabase(VALID_ROW);
    await createTodo(client, { title: "회의" });
    expect(updates.at(-1)!.recurrence).toBeNull();
  });

  it("updateTodo로 반복을 해제할 수 있다", async () => {
    const { client, updates } = recordingSupabase({ ...VALID_ROW, recurrence: null });
    await updateTodo(client, VALID_ROW.id, { recurrence: null });
    expect(updates.at(-1)!.recurrence).toBeNull();
  });

  it("반복 컬럼이 없는 기존 행도 그대로 읽힌다 (하위호환)", async () => {
    // 마이그레이션 적용 전 응답이나 오래된 캐시에는 recurrence 키 자체가 없다.
    const result = await listTodos(fakeSupabase());
    expect(result[0].recurrence).toBeNull();
  });
});

describe("listTodos", () => {
  it("정상 응답을 Todo[]로 변환한다", async () => {
    const result = await listTodos(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("우유 사기");
  });

  it("잘못된 형태의 응답이면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({
              data: [{ ...VALID_ROW, title: "" }],
              error: null,
            }),
          }),
        }),
      }),
    });
    await expect(listTodos(supabase)).rejects.toThrow();
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({
              data: null,
              error: { message: "connection failed" },
            }),
          }),
        }),
      }),
    });
    await expect(listTodos(supabase)).rejects.toThrow("connection failed");
  });
});

describe("createTodo", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(createTodo(supabase, { title: "test" })).rejects.toThrow(
      "로그인이 필요합니다.",
    );
  });

  it("정상 입력이면 Todo를 반환한다", async () => {
    const result = await createTodo(fakeSupabase(), { title: "우유 사기" });
    expect(result.title).toBe("우유 사기");
  });
});

describe("updateTodo", () => {
  it("정상 patch면 갱신된 Todo를 반환한다", async () => {
    const result = await updateTodo(fakeSupabase(), VALID_ROW.id, {
      isDone: true,
    });
    expect(result.id).toBe(VALID_ROW.id);
  });
});

describe("deleteTodo", () => {
  it("에러 없이 완료된다", async () => {
    await expect(
      deleteTodo(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
  });
});

// create/update/delete의 DB 에러 전파(`if (error) throw`) 브랜치. list는 위에서 커버됨.
describe("DB 에러 전파", () => {
  it("createTodo는 insert 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "create-boom" } }),
          }),
        }),
      }),
    });
    await expect(createTodo(supabase, { title: "x" })).rejects.toThrow(
      "create-boom",
    );
  });

  it("updateTodo는 갱신 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "update-boom" } }),
            }),
          }),
        }),
      }),
    });
    await expect(
      updateTodo(supabase, VALID_ROW.id, { isDone: true }),
    ).rejects.toThrow("update-boom");
  });

  it("deleteTodo는 delete 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: "delete-boom" } }),
        }),
      }),
    });
    await expect(deleteTodo(supabase, VALID_ROW.id)).rejects.toThrow(
      "delete-boom",
    );
  });
});
