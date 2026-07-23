import { describe, expect, it } from "vitest";
import { getGmailTokens, saveGmailTokens } from "./gmailTokens";

const ROW = {
  user_id: "11111111-1111-4111-8111-111111111111",
  access_token: "ya29.gmailtoken",
  refresh_token: "1//gmail-refresh",
  scope: "https://www.googleapis.com/auth/gmail.modify",
  expires_at: "2026-07-23T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
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

describe("saveGmailTokens", () => {
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
    const result = await saveGmailTokens(supabase, {
      userId: ROW.user_id,
      accessToken: "ya29.gmailtoken",
      refreshToken: "1//gmail-refresh",
      scope: ROW.scope,
      expiresAt: "2026-07-23T00:00:00.000Z",
    });
    expect(captured?.user_id).toBe(ROW.user_id);
    expect(captured?.access_token).toBe("ya29.gmailtoken");
    expect(capturedConflict).toEqual({ onConflict: "user_id" });
    expect(result.accessToken).toBe("ya29.gmailtoken");
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
      saveGmailTokens(supabase, {
        userId: ROW.user_id,
        accessToken: "x",
        refreshToken: null,
        scope: "s",
        expiresAt: "2026-07-23T00:00:00.000Z",
      }),
    ).rejects.toThrow("boom");
  });
});

describe("getGmailTokens", () => {
  it("저장된 토큰을 GmailOAuthToken으로 변환한다", async () => {
    const result = await getGmailTokens(fakeSupabase(), ROW.user_id);
    expect(result?.accessToken).toBe("ya29.gmailtoken");
  });

  it("행이 없으면 null을 반환한다(Gmail 미연동, 에러 아님)", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      }),
    });
    const result = await getGmailTokens(supabase, ROW.user_id);
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
    await expect(getGmailTokens(supabase, ROW.user_id)).rejects.toThrow("boom");
  });
});
