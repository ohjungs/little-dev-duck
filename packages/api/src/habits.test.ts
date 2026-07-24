import { describe, expect, it } from "vitest";
import {
  checkHabit,
  createHabit,
  deleteHabit,
  listHabitChecks,
  listHabitChecksInRange,
  listHabits,
  uncheckHabit,
} from "./habits";

const VALID_HABIT_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "물 마시기",
  frequency: "daily" as const,
  times_per_week: null,
  created_at: "2026-07-20T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

const VALID_CHECK_ROW = {
  id: "33333333-3333-4333-8333-333333333333",
  habit_id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  checked_date: "2026-07-21",
  created_at: "2026-07-21T00:00:00.000Z",
};

const VALID_DUCK_ROW = {
  user_id: "22222222-2222-4222-8222-222222222222",
  xp: 0,
  level: 1,
  feed: 0,
  costume: "default",
  updated_at: "2026-07-20T00:00:00.000Z",
};

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: VALID_HABIT_ROW.user_id } },
      }),
    },
    from: () => ({
      select: () => ({
        order: async () => ({ data: [VALID_HABIT_ROW], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: VALID_HABIT_ROW, error: null }),
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

describe("listHabits", () => {
  it("정상 응답을 Habit[]로 변환한다", async () => {
    const result = await listHabits(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("물 마시기");
    expect(result[0].timesPerWeek).toBeNull();
  });

  it("잘못된 형태의 응답이면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: async () => ({
            data: [{ ...VALID_HABIT_ROW, title: "" }],
            error: null,
          }),
        }),
      }),
    });
    await expect(listHabits(supabase)).rejects.toThrow();
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
    await expect(listHabits(supabase)).rejects.toThrow("connection failed");
  });
});

describe("createHabit", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      createHabit(supabase, { title: "운동", frequency: "daily" }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("정상 입력이면 Habit을 반환한다", async () => {
    const result = await createHabit(fakeSupabase(), {
      title: "물 마시기",
      frequency: "daily",
    });
    expect(result.title).toBe("물 마시기");
    expect(result.frequency).toBe("daily");
  });
});

describe("listHabitChecks", () => {
  it("정상 응답을 HabitCheck[]로 변환한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: async () => ({ data: [VALID_CHECK_ROW], error: null }),
        }),
      }),
    });
    const result = await listHabitChecks(supabase);
    expect(result).toHaveLength(1);
    expect(result[0].checkedDate).toBe("2026-07-21");
    expect(result[0].habitId).toBe(VALID_HABIT_ROW.id);
  });
});

describe("checkHabit", () => {
  it("체크를 삽입하고 XP 지급 후 삽입된 체크를 반환한다", async () => {
    // 체크 insert → 삽입 체크 반환, 이어지는 applyXpAward는 duck_state select/update로 처리.
    const supabase = fakeSupabase({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: VALID_CHECK_ROW, error: null }),
          }),
        }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: VALID_DUCK_ROW, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: VALID_DUCK_ROW, error: null }),
            }),
          }),
        }),
      }),
    });
    const result = await checkHabit(supabase, VALID_HABIT_ROW.id, "2026-07-21");
    expect(result.habitId).toBe(VALID_HABIT_ROW.id);
    expect(result.checkedDate).toBe("2026-07-21");
  });

  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      checkHabit(supabase, VALID_HABIT_ROW.id, "2026-07-21"),
    ).rejects.toThrow("로그인이 필요합니다.");
  });
});

describe("uncheckHabit", () => {
  it("두 조건(habit_id, checked_date)으로 삭제하고 완료된다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    });
    await expect(
      uncheckHabit(supabase, VALID_HABIT_ROW.id, "2026-07-21"),
    ).resolves.toBeUndefined();
  });
});

describe("deleteHabit", () => {
  it("에러 없이 완료된다", async () => {
    await expect(
      deleteHabit(fakeSupabase(), VALID_HABIT_ROW.id),
    ).resolves.toBeUndefined();
  });
});

describe("listHabitChecksInRange", () => {
  it("범위 조회 결과를 HabitCheck[]로 변환한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          gte: () => ({
            lte: () => ({
              order: async () => ({ data: [VALID_CHECK_ROW], error: null }),
            }),
          }),
        }),
      }),
    });
    const result = await listHabitChecksInRange(supabase, "2026-07-01", "2026-07-31");
    expect(result).toHaveLength(1);
    expect(result[0].checkedDate).toBe("2026-07-21");
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          gte: () => ({
            lte: () => ({
              order: async () => ({ data: null, error: { message: "range-boom" } }),
            }),
          }),
        }),
      }),
    });
    await expect(
      listHabitChecksInRange(supabase, "2026-07-01", "2026-07-31"),
    ).rejects.toThrow("range-boom");
  });
});

// 각 함수의 DB 에러 전파(`if (error) throw`) 브랜치. listHabits는 위에서 커버됨.
describe("DB 에러 전파", () => {
  it("createHabit은 insert 에러를 던진다", async () => {
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
      createHabit(supabase, { title: "x", frequency: "daily" }),
    ).rejects.toThrow("create-boom");
  });

  it("deleteHabit은 delete 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: "delete-boom" } }),
        }),
      }),
    });
    await expect(deleteHabit(supabase, VALID_HABIT_ROW.id)).rejects.toThrow(
      "delete-boom",
    );
  });

  it("listHabitChecks는 조회 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: async () => ({ data: null, error: { message: "checks-boom" } }),
        }),
      }),
    });
    await expect(listHabitChecks(supabase)).rejects.toThrow("checks-boom");
  });

  it("checkHabit은 insert 에러면 XP 지급 전에 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "check-boom" } }),
          }),
        }),
      }),
    });
    await expect(
      checkHabit(supabase, VALID_HABIT_ROW.id, "2026-07-21"),
    ).rejects.toThrow("check-boom");
  });

  it("uncheckHabit은 delete 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: () => ({
            eq: async () => ({ error: { message: "uncheck-boom" } }),
          }),
        }),
      }),
    });
    await expect(
      uncheckHabit(supabase, VALID_HABIT_ROW.id, "2026-07-21"),
    ).rejects.toThrow("uncheck-boom");
  });
});
