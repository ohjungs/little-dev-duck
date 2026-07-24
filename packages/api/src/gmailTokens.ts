import type { SupabaseClient } from "@supabase/supabase-js";
import { gmailOAuthTokenSchema, type GmailOAuthToken } from "@ldd/core";
import { createTokenModule, type SaveTokenInput } from "./oauthTokens";

// Phase 10 T6: user_gmail_tokens(마이그레이션 20260723103000) CRUD. oauthTokens 팩토리로 위임.
const _module = createTokenModule(
  "user_gmail_tokens",
  gmailOAuthTokenSchema,
  (row) => ({
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scope: row.scope,
    expiresAt: row.expires_at as string,
    updatedAt: row.updated_at,
  }),
);

export type SaveGmailTokenInput = SaveTokenInput;

export async function saveGmailTokens(
  supabase: SupabaseClient,
  input: SaveGmailTokenInput,
): Promise<GmailOAuthToken> {
  return _module.save(supabase, input);
}

// 저장된 토큰이 없으면 null(= 아직 Gmail 미연동, 에러 아님).
export async function getGmailTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<GmailOAuthToken | null> {
  return _module.get(supabase, userId);
}
