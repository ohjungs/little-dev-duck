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
        order: async () => ({ data: [VALID_ROW], error: null }),
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
          order: async () => ({
            data: [{ ...VALID_ROW, title: "" }],
            error: null,
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
          order: async () => ({
            data: null,
            error: { message: "connection failed" },
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
