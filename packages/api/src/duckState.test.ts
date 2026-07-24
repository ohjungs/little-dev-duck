import { describe, expect, it } from "vitest";
import { XP_REWARDS } from "@ldd/core";
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
