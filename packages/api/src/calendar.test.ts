import { describe, expect, it } from "vitest";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "./calendar";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "출시일",
  start_at: "2026-07-25T00:00:00.000Z",
  end_at: null,
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

describe("listCalendarEvents", () => {
  it("정상 응답을 CalendarEvent[]로 변환한다", async () => {
    const result = await listCalendarEvents(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("출시일");
    expect(result[0].startAt).toBe(VALID_ROW.start_at);
    expect(result[0].endAt).toBeNull();
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
    await expect(listCalendarEvents(supabase)).rejects.toThrow();
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
    await expect(listCalendarEvents(supabase)).rejects.toThrow(
      "connection failed",
    );
  });
});

describe("createCalendarEvent", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      createCalendarEvent(supabase, {
        title: "출시일",
        startAt: "2026-07-25T00:00:00.000Z",
      }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("정상 입력이면 CalendarEvent를 반환한다", async () => {
    const result = await createCalendarEvent(fakeSupabase(), {
      title: "출시일",
      startAt: "2026-07-25T00:00:00.000Z",
    });
    expect(result.title).toBe("출시일");
  });
});

describe("updateCalendarEvent", () => {
  it("정상 patch면 갱신된 CalendarEvent를 반환한다", async () => {
    const result = await updateCalendarEvent(fakeSupabase(), VALID_ROW.id, {
      title: "출시일 변경",
    });
    expect(result.id).toBe(VALID_ROW.id);
  });
});

describe("deleteCalendarEvent", () => {
  it("에러 없이 완료된다", async () => {
    await expect(
      deleteCalendarEvent(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
  });
});

// create/update/delete의 DB 에러 전파(`if (error) throw`) 브랜치. list는 위에서 커버됨.
describe("DB 에러 전파", () => {
  it("createCalendarEvent는 insert 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "create-boom" } }),
          }),
        }),
      }),
    });
    await expect(
      createCalendarEvent(supabase, {
        title: "x",
        startAt: "2026-07-25T00:00:00.000Z",
      }),
    ).rejects.toThrow("create-boom");
  });

  it("updateCalendarEvent는 갱신 에러를 던진다", async () => {
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
      updateCalendarEvent(supabase, VALID_ROW.id, { title: "x" }),
    ).rejects.toThrow("update-boom");
  });

  it("deleteCalendarEvent는 delete 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: "delete-boom" } }),
        }),
      }),
    });
    await expect(
      deleteCalendarEvent(supabase, VALID_ROW.id),
    ).rejects.toThrow("delete-boom");
  });
});
