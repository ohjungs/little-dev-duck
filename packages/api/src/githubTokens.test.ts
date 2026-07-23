import { describe, expect, it } from "vitest";
import { getGithubTokens, saveGithubTokens } from "./githubTokens";

const ROW = {
  user_id: "11111111-1111-4111-8111-111111111111",
  access_token: "gho_token",
  refresh_token: null,
  scope: "public_repo",
  expires_at: null,
  updated_at: "2026-07-23T00:00:00.000Z",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(overrides: Record<string, unknown> = {}): any {
  return {
    from: () => ({
      upsert: () => ({
        select: () => ({ single: async () => ({ data: ROW, error: null }) }),
      }),
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: ROW, error: null }) }),
      }),
    }),
    ...overrides,
  };
}

describe("saveGithubTokens", () => {
  it("upsert 페이로드를 스네이크케이스로 구성하고 저장 결과를 반환한다", async () => {
    let captured: Record<string, unknown> | undefined;
    let capturedConflict: unknown;
    const supabase = fakeSupabase({
      from: () => ({
        upsert: (payload: Record<string, unknown>, opts: unknown) => {
          captured = payload;
          capturedConflict = opts;
          return { select: () => ({ single: async () => ({ data: ROW, error: null }) }) };
        },
      }),
    });
    const result = await saveGithubTokens(supabase, {
      userId: ROW.user_id,
      accessToken: "gho_token",
      refreshToken: null,
      scope: ROW.scope,
      expiresAt: null,
    });
    expect(captured?.user_id).toBe(ROW.user_id);
    expect(captured?.access_token).toBe("gho_token");
    expect(capturedConflict).toEqual({ onConflict: "user_id" });
    expect(result.accessToken).toBe("gho_token");
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        upsert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    });
    await expect(
      saveGithubTokens(supabase, {
        userId: ROW.user_id,
        accessToken: "x",
        refreshToken: null,
        scope: "s",
        expiresAt: null,
      }),
    ).rejects.toThrow("boom");
  });
});

describe("getGithubTokens", () => {
  it("저장된 토큰을 GithubOAuthToken으로 변환한다", async () => {
    const result = await getGithubTokens(fakeSupabase(), ROW.user_id);
    expect(result?.accessToken).toBe("gho_token");
  });

  it("행이 없으면 null을 반환한다(GitHub 이슈 미연동, 에러 아님)", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      }),
    });
    const result = await getGithubTokens(supabase, ROW.user_id);
    expect(result).toBeNull();
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    });
    await expect(getGithubTokens(supabase, ROW.user_id)).rejects.toThrow("boom");
  });
});
