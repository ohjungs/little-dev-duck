import { describe, expect, it } from "vitest";
import { XP_REWARDS } from "@ldd/core";
import {
  completePomodoro,
  listPomodoroSessions,
  startPomodoro,
} from "./pomodoro";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  duration_minutes: 25,
  tag: "공부",
  started_at: "2026-07-20T00:00:00.000Z",
  completed_at: null as string | null,
  created_at: "2026-07-20T00:00:00.000Z",
};

const COMPLETED_ROW = {
  ...VALID_ROW,
  completed_at: "2026-07-21T00:00:00.000Z",
};

// completePomodoro는 applyXpAward를 호출하므로 duck_state 경로도 mock이 응답해야 한다.
const VALID_DUCK_ROW = {
  user_id: VALID_ROW.user_id,
  xp: 30,
  level: 1,
  feed: 10,
  costume: "default",
  updated_at: "2026-07-20T00:00:00.000Z",
};

type FakeOpts = {
  // 조건부 완료 update가 돌려줄 결과(완료 성공 시 행, 이미 완료면 data: null).
  completeResult?: { data: unknown; error: unknown };
  // applyXpAward가 duck_state를 갱신할 때의 payload를 캡처(XP 부수효과 검증용).
  onDuckUpdate?: (payload: unknown) => void;
};

function fakeSupabase(
  opts: FakeOpts = {},
  overrides: Record<string, unknown> = {},
) {
  const completeResult = opts.completeResult ?? {
    data: COMPLETED_ROW,
    error: null,
  };
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
    },
    from: (table: string) => {
      if (table === "duck_state") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: VALID_DUCK_ROW, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: VALID_DUCK_ROW, error: null }),
            }),
          }),
          update: (payload: unknown) => {
            opts.onDuckUpdate?.(payload);
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: VALID_DUCK_ROW, error: null }),
                }),
              }),
            };
          },
        };
      }
      // pomodoro_sessions
      return {
        select: () => ({
          order: () => ({ limit: async () => ({ data: [VALID_ROW], error: null }) }),
          eq: () => ({
            single: async () => ({ data: COMPLETED_ROW, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: VALID_ROW, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: () => ({
              select: () => ({
                maybeSingle: async () => completeResult,
              }),
            }),
          }),
        }),
      };
    },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("listPomodoroSessions", () => {
  it("정상 응답을 PomodoroSession[]로 변환한다", async () => {
    const result = await listPomodoroSessions(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].durationMinutes).toBe(25);
    expect(result[0].userId).toBe(VALID_ROW.user_id);
  });

  it("잘못된 형태의 응답이면 에러를 던진다", async () => {
    const supabase = fakeSupabase(
      {},
      {
        from: () => ({
          select: () => ({
            order: () => ({
              limit: async () => ({
                data: [{ ...VALID_ROW, duration_minutes: 0 }],
                error: null,
              }),
            }),
          }),
        }),
      },
    );
    await expect(listPomodoroSessions(supabase)).rejects.toThrow();
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase(
      {},
      {
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
      },
    );
    await expect(listPomodoroSessions(supabase)).rejects.toThrow(
      "connection failed",
    );
  });
});

describe("startPomodoro", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase(
      {},
      { auth: { getUser: async () => ({ data: { user: null } }) } },
    );
    await expect(
      startPomodoro(supabase, { durationMinutes: 25 }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("정상 입력이면 PomodoroSession을 반환한다", async () => {
    const result = await startPomodoro(fakeSupabase(), {
      durationMinutes: 25,
      tag: "공부",
    });
    expect(result.durationMinutes).toBe(25);
    expect(result.completedAt).toBeNull();
  });
});

describe("completePomodoro", () => {
  it("완료된 세션을 반환하고 XP를 지급한다", async () => {
    const updates: unknown[] = [];
    const result = await completePomodoro(
      fakeSupabase({ onDuckUpdate: (p) => updates.push(p) }),
      VALID_ROW.id,
    );
    expect(result.id).toBe(VALID_ROW.id);
    // 부수효과: duck_state가 pomodoroComplete 보상만큼 xp 증가로 갱신됐는지 검증.
    expect(updates).toHaveLength(1);
    expect((updates[0] as { xp: number }).xp).toBe(
      VALID_DUCK_ROW.xp + XP_REWARDS.pomodoroComplete,
    );
  });

  it("이미 완료된 세션은 XP를 재지급하지 않는다", async () => {
    const updates: unknown[] = [];
    // 조건부 update가 0행(이미 완료) → data null.
    const result = await completePomodoro(
      fakeSupabase({
        completeResult: { data: null, error: null },
        onDuckUpdate: (p) => updates.push(p),
      }),
      VALID_ROW.id,
    );
    expect(result.completedAt).not.toBeNull();
    expect(updates).toHaveLength(0);
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      completeResult: { data: null, error: { message: "update failed" } },
    });
    await expect(completePomodoro(supabase, VALID_ROW.id)).rejects.toThrow(
      "update failed",
    );
  });
});
