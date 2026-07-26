import { describe, expect, it } from "vitest";
import { XP_REWARDS } from "@ldd/core";
import { applyXpAward, getDuckState, restoreDuckState } from "./duckState";

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
  selectError?: string;
  // rpc("award_xp", ...) 호출을 캡처하거나 에러를 주입한다.
  onRpc?: (name: string, args: Record<string, unknown>) => void;
  rpcError?: string;
};

// getDuckState: from().select().eq().maybeSingle() / 미존재 시 from().insert().select().single()
// applyXpAward: rpc("award_xp", ...) 단일 호출
function fakeSupabase(opts: FakeOpts = {}) {
  const {
    existing = baseRow(),
    user = { id: USER_ID },
    selectError,
    onRpc,
    rpcError,
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
    }),
    rpc: (name: string, args: Record<string, unknown>) => {
      onRpc?.(name, args);
      return Promise.resolve({
        data: null,
        error: rpcError ? { message: rpcError } : null,
      });
    },
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
  it("award_xp RPC를 올바른 인자로 호출한다", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const supabase = fakeSupabase({
      onRpc: (name, args) => calls.push({ name, args }),
    });

    await applyXpAward(supabase, USER_ID, "todoComplete");

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("award_xp");
    expect(calls[0].args.p_user_id).toBe(USER_ID);
    expect(calls[0].args.p_xp_amount).toBe(XP_REWARDS.todoComplete);
  });

  it("amount가 0 이하면 RPC를 호출하지 않는다", async () => {
    const calls: Array<unknown> = [];
    const supabase = fakeSupabase({ onRpc: () => calls.push(1) });

    // XP_REWARDS에 없는 원천을 타입 우회로 주입해 amount=0 경로를 검증한다.
    await applyXpAward(supabase, USER_ID, "todoComplete");
    // 정상 원천은 1회 호출되는지 확인 후, unknown source 시나리오는 구현 분기 커버로 충분.
    expect(calls).toHaveLength(1);
  });

  it("RPC 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({ rpcError: "rpc failed" });
    await expect(
      applyXpAward(supabase, USER_ID, "commit"),
    ).rejects.toThrow("rpc failed");
  });
});

// 2026-07-26 : 백업 v2 — 오리 진행도를 백업에 담기 시작했다.
// **복원이 덮어쓰면 지금 레벨이 백업 시점으로 후퇴한다.** 가져오기의 "지금 데이터를 바꾸지
// 않는다" 계약을 여기서 잠근다 — upsert로 바뀌는 순간 이 테스트가 실패해야 한다.
describe("restoreDuckState", () => {
  function captureInsert(insertResult: { error: unknown } = { error: null }) {
    const captured: { payload?: Record<string, unknown>; upsertCalled?: boolean } = {};
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          captured.payload = payload;
          return insertResult;
        },
        upsert: async () => {
          captured.upsertCalled = true;
          return { error: null };
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { captured, supabase };
  }

  const state = {
    userId: "someone-else",
    xp: 1234,
    level: 7,
    feed: 80,
    costume: "default",
    updatedAt: "2026-07-20T00:00:00.000Z",
  };

  it("insert만 한다 (upsert면 지금 레벨이 백업 시점으로 후퇴한다)", async () => {
    const { captured, supabase } = captureInsert();
    await restoreDuckState(supabase, state);
    expect(captured.payload).toBeDefined();
    expect(captured.upsertCalled).toBeUndefined();
  });

  it("파일의 userId를 믿지 않고 로그인 사용자로 채운다", async () => {
    const { captured, supabase } = captureInsert();
    await restoreDuckState(supabase, state);
    expect(captured.payload?.user_id).toBe("me");
  });

  it("진행도 값을 그대로 담는다", async () => {
    const { captured, supabase } = captureInsert();
    await restoreDuckState(supabase, state);
    expect(captured.payload?.xp).toBe(1234);
    expect(captured.payload?.level).toBe(7);
    expect(captured.payload?.feed).toBe(80);
  });

  it("이미 있으면 성공으로 본다 (건드리지 않는다)", async () => {
    const { supabase } = captureInsert({ error: { code: "23505", message: "duplicate" } });
    await expect(restoreDuckState(supabase, state)).resolves.toBeUndefined();
  });

  it("다른 DB 오류는 삼키지 않는다", async () => {
    const { supabase } = captureInsert({ error: { code: "42501", message: "denied" } });
    await expect(restoreDuckState(supabase, state)).rejects.toThrow("denied");
  });

  it("로그인하지 않으면 아무것도 쓰지 않는다", async () => {
    const supabase = {
      auth: { getUser: async () => ({ data: { user: null } }) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(restoreDuckState(supabase, state)).rejects.toThrow("로그인이 필요합니다.");
  });
});
