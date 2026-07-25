import { describe, expect, it } from "vitest";
import {
  createMemo,
  deleteMemo,
  listMemos,
  restoreMemo,
  updateMemo,
} from "./memos";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "회의 메모",
  content: "다음 스프린트 계획",
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

describe("listMemos", () => {
  it("정상 응답을 Memo[]로 변환한다", async () => {
    const result = await listMemos(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("회의 메모");
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
    await expect(listMemos(supabase)).rejects.toThrow();
  });
});

describe("createMemo", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(createMemo(supabase, { content: "test" })).rejects.toThrow(
      "로그인이 필요합니다.",
    );
  });

  it("정상 입력이면 Memo를 반환한다", async () => {
    const result = await createMemo(fakeSupabase(), {
      content: "다음 스프린트 계획",
    });
    expect(result.content).toBe("다음 스프린트 계획");
  });

  it("스티커 메모는 title 입력 없이 content만으로 저장된다 (title은 content 첫 줄에서 자동 유도)", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: async () => ({ data: VALID_ROW, error: null }),
            }),
          };
        },
      }),
    });

    await createMemo(supabase, { content: "첫 줄\n둘째 줄" });

    expect(insertedPayload?.title).toBe("첫 줄");
    expect(insertedPayload?.content).toBe("첫 줄\n둘째 줄");
  });

  it("빈 content로 저장하면 기본 제목이 유도된다", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: async () => ({ data: VALID_ROW, error: null }),
            }),
          };
        },
      }),
    });

    await createMemo(supabase, { content: "" });

    expect(insertedPayload?.title).toBe("메모");
  });

  it("공백만 있는 content도 기본 제목이 유도된다", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: async () => ({ data: VALID_ROW, error: null }),
            }),
          };
        },
      }),
    });

    await createMemo(supabase, { content: "   \n  " });

    expect(insertedPayload?.title).toBe("메모");
  });

  it("첫 줄이 200자를 넘으면 title은 200자로 잘린다 (DB check 제약 준수)", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: async () => ({ data: VALID_ROW, error: null }),
            }),
          };
        },
      }),
    });

    await createMemo(supabase, { content: "a".repeat(250) });

    expect((insertedPayload?.title as string).length).toBe(200);
  });
});

describe("updateMemo", () => {
  it("정상 patch면 갱신된 Memo를 반환한다", async () => {
    const result = await updateMemo(fakeSupabase(), VALID_ROW.id, {
      content: "수정된 내용",
    });
    expect(result.id).toBe(VALID_ROW.id);
  });

  it("content를 수정하면 title도 새 content 첫 줄로 재유도된다", async () => {
    let updatedPayload: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          updatedPayload = payload;
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: VALID_ROW, error: null }),
              }),
            }),
          };
        },
      }),
    });

    await updateMemo(supabase, VALID_ROW.id, { content: "수정된 첫 줄\n나머지" });

    expect(updatedPayload?.title).toBe("수정된 첫 줄");
    expect(updatedPayload?.content).toBe("수정된 첫 줄\n나머지");
  });
});

describe("deleteMemo", () => {
  it("에러 없이 완료된다", async () => {
    await expect(
      deleteMemo(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
  });
});

// 각 함수의 DB 에러 전파(`if (error) throw`) 브랜치. UI가 이 예외로 재시도 상태를 띄우므로
// 조용히 삼키지 않는지 검증한다.
describe("DB 에러 전파", () => {
  it("listMemos는 조회 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: () => ({ limit: async () => ({ data: null, error: { message: "list-boom" } }) }),
        }),
      }),
    });
    await expect(listMemos(supabase)).rejects.toThrow("list-boom");
  });

  it("createMemo는 insert 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "create-boom" } }),
          }),
        }),
      }),
    });
    await expect(createMemo(supabase, { content: "x" })).rejects.toThrow(
      "create-boom",
    );
  });

  it("updateMemo는 갱신 에러를 던진다", async () => {
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
      updateMemo(supabase, VALID_ROW.id, { content: "x" }),
    ).rejects.toThrow("update-boom");
  });

  it("deleteMemo는 delete 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: "delete-boom" } }),
        }),
      }),
    });
    await expect(deleteMemo(supabase, VALID_ROW.id)).rejects.toThrow(
      "delete-boom",
    );
  });
});

describe("restoreMemo (Phase 21 T1)", () => {
  const deleted = {
    id: VALID_ROW.id,
    userId: VALID_ROW.user_id,
    title: "회의 메모",
    content: "다음 스프린트 계획",
    createdAt: VALID_ROW.created_at,
    updatedAt: VALID_ROW.updated_at,
  };

  function recording() {
    const inserts: Record<string, unknown>[] = [];
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }) },
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          inserts.push(payload);
          return {
            select: () => ({ single: async () => ({ data: VALID_ROW, error: null }) }),
          };
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { client, inserts };
  }

  it("id와 생성시각까지 그대로 되살린다", async () => {
    const { client, inserts } = recording();
    await restoreMemo(client, deleted);
    expect(inserts.at(-1)!.id).toBe(VALID_ROW.id);
    expect(inserts.at(-1)!.created_at).toBe(VALID_ROW.created_at);
    expect(inserts.at(-1)!.content).toBe("다음 스프린트 계획");
  });

  it("user_id는 인자가 아니라 로그인 사용자로 채운다", async () => {
    const { client, inserts } = recording();
    await restoreMemo(client, {
      ...deleted,
      userId: "99999999-9999-4999-8999-999999999999",
    });
    expect(inserts.at(-1)!.user_id).toBe(VALID_ROW.user_id);
  });

  it("이미 있는 id면 에러가 아니라 멱등 성공이다", async () => {
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }) },
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: "23505" } }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(restoreMemo(client, deleted)).resolves.toBeUndefined();
  });

  it("로그인 상태가 아니면 거부한다", async () => {
    const client = {
      auth: { getUser: async () => ({ data: { user: null } }) },
      from: () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(restoreMemo(client, deleted)).rejects.toThrow("로그인");
  });

  it("다른 DB 에러는 그대로 던진다", async () => {
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }) },
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { code: "42501", message: "restore-boom" },
            }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(restoreMemo(client, deleted)).rejects.toThrow("restore-boom");
  });
});
