import { describe, expect, it } from "vitest";
import { deriveLevel } from "@ldd/core";
import { applyXpAward, getDuckState } from "./duckState";

// 유효한 v4 UUID (버전 니블 4, 변형 니블 8). duckStateSchema.userId 통과용.
const USER_ID = "33333333-3333-4333-8333-333333333333";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: USER_ID,
    xp: 0,
    level: 1,
    feed: 0,
    costume: "default",
    updated_at: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

type FakeOpts = {
  // select().eq().maybeSingle()가 반환할 기존 행. null이면 미존재(→ insert 경로).
  existing?: ReturnType<typeof baseRow> | null;
  user?: { id: string } | null;
  onUpdate?: (payload: Record<string, unknown>) => void;
  selectError?: string;
};

// getDuckState: from().select().eq().maybeSingle() / 미존재 시 from().insert().select().single()
// applyXpAward: getDuckState 후 from().update().eq().select().single()
function fakeSupabase(opts: FakeOpts = {}) {
  const {
    existing = baseRow(),
    user = { id: USER_ID },
    onUpdate,
    selectError,
  } = opts;
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: selectError ? null : existing,
            error: selectError ? { message: selectError } : null,
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: baseRow(), error: null }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        onUpdate?.(payload);
        return {
          eq: () => ({
            select: () => ({
              // update가 쓴 값을 그대로 반영해 반환 — applyXpAward의 재계산 결과를 검증할 수 있게 한다.
              single: async () => ({
                data: { ...baseRow(), ...payload },
                error: null,
              }),
            }),
          }),
        };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getDuckState", () => {
  it("기존 duck_state 행을 그대로 반환한다", async () => {
    const result = await getDuckState(
      fakeSupabase({ existing: baseRow({ xp: 42, level: 1, feed: 5 }) }),
    );
    expect(result.userId).toBe(USER_ID);
    expect(result.xp).toBe(42);
    expect(result.feed).toBe(5);
  });

  it("행이 없으면 기본값 행을 만들어 반환한다", async () => {
    const result = await getDuckState(fakeSupabase({ existing: null }));
    expect(result.userId).toBe(USER_ID);
    expect(result.level).toBe(1);
    expect(result.xp).toBe(0);
    expect(result.feed).toBe(0);
  });

  it("로그인하지 않으면 에러를 던진다", async () => {
    await expect(
      getDuckState(fakeSupabase({ user: null })),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("조회 DB 에러면 예외를 던진다", async () => {
    await expect(
      getDuckState(fakeSupabase({ selectError: "connection failed" })),
    ).rejects.toThrow("connection failed");
  });
});

describe("applyXpAward", () => {
  it("XP 보상 적용 후 level을 새 xp에 맞게 재계산한다 (deriveLevel 경계)", async () => {
    const captured: Record<string, unknown> = {};
    // 현재 xp 95 + todoComplete(+10) = 105 → level 1→2 경계(xpForLevel(2)=100)를 넘는다.
    const supabase = fakeSupabase({
      existing: baseRow({ xp: 95, level: 1, feed: 0 }),
      onUpdate: (payload) => Object.assign(captured, payload),
    });

    const result = await applyXpAward(supabase, "todoComplete");

    expect(result.xp).toBe(105);
    expect(result.level).toBe(2);
    expect(result.level).toBe(deriveLevel(105));
    // 먹이: gained(10) * FEED_PER_XP(0.1) = 1 적립.
    expect(result.feed).toBe(1);

    // DB에 실제로 쓴 값도 재계산 결과와 일치해야 한다.
    expect(captured.xp).toBe(105);
    expect(captured.level).toBe(2);
    expect(captured.feed).toBe(1);
  });

  it("레벨 경계를 넘지 않는 보상은 level을 유지한다", async () => {
    const supabase = fakeSupabase({
      existing: baseRow({ xp: 10, level: 1, feed: 0 }),
    });

    const result = await applyXpAward(supabase, "commit");

    expect(result.xp).toBe(15);
    expect(result.level).toBe(1);
    expect(result.level).toBe(deriveLevel(15));
  });
});
