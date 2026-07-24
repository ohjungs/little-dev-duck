import type { SupabaseClient } from "@supabase/supabase-js";
import { googleOAuthTokenSchema, type GoogleOAuthToken } from "@ldd/core";
import { createTokenModule, type SaveTokenInput } from "./oauthTokens";

// Phase 10 T3: user_google_tokens(마이그레이션 20260722080000) CRUD. user_id가 PK라 upsert = 캡처·갱신 둘 다.
// 공통 팩토리(oauthTokens.ts)로 위임 — OAuth 콜백에서 최초 로그인 시점에만 노출되는 provider_token을
// 즉시 이 테이블로 옮겨 담는다(캡처). refreshToken null 처리 판단은 호출부(콜백)에 위임.
const _module = createTokenModule(
  "user_google_tokens",
  googleOAuthTokenSchema,
  (row) => ({
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scope: row.scope,
    // Google의 expiresAt은 non-nullable이지만 팩토리 row 타입은 nullable — 실제 DB 행은 항상 채워져 있음.
    expiresAt: row.expires_at as string,
    updatedAt: row.updated_at,
  }),
);

export type SaveGoogleTokenInput = SaveTokenInput;

export async function saveGoogleTokens(
  supabase: SupabaseClient,
  input: SaveGoogleTokenInput,
): Promise<GoogleOAuthToken> {
  return _module.save(supabase, input);
}

// 저장된 토큰이 없으면 null(= 아직 Calendar 연동 안 함, 에러 아님 — 호출부가 "연동 필요" 안내로 처리).
export async function getGoogleTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoogleOAuthToken | null> {
  return _module.get(supabase, userId);
}
