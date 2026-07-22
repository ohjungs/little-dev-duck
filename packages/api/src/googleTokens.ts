import type { SupabaseClient } from "@supabase/supabase-js";
import { googleOAuthTokenSchema, type GoogleOAuthToken } from "@ldd/core";

// Phase 10 T3: user_google_tokens(마이그레이션 20260722080000) CRUD. user_id가 PK라 upsert = 캡처·갱신 둘 다.
type GoogleTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  scope: string;
  expires_at: string;
  updated_at: string;
};

function fromRow(row: GoogleTokenRow): GoogleOAuthToken {
  return googleOAuthTokenSchema.parse({
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scope: row.scope,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  });
}

export type SaveGoogleTokenInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresAt: string;
};

// OAuth 콜백에서 최초 로그인 시점에만 노출되는 provider_token을 즉시 이 테이블로 옮겨 담는다(캡처).
// refreshToken이 이번엔 null이더라도(재동의 아닌 일반 재로그인) 기존 저장된 값을 지우지 않도록, 호출부가
// null을 넘기면 upsert가 컬럼을 덮어써 지워버리므로 — 그 판단은 호출부(콜백)가 "받은 값이 있을 때만" 하도록 위임.
export async function saveGoogleTokens(
  supabase: SupabaseClient,
  input: SaveGoogleTokenInput,
): Promise<GoogleOAuthToken> {
  const { data, error } = await supabase
    .from("user_google_tokens")
    .upsert(
      {
        user_id: input.userId,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        scope: input.scope,
        expires_at: input.expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as GoogleTokenRow);
}

// 저장된 토큰이 없으면 null(= 아직 Calendar 연동 안 함, 에러 아님 — 호출부가 "연동 필요" 안내로 처리).
export async function getGoogleTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoogleOAuthToken | null> {
  const { data, error } = await supabase
    .from("user_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return fromRow(data as GoogleTokenRow);
}
