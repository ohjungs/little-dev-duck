import type { SupabaseClient } from "@supabase/supabase-js";
import { gmailOAuthTokenSchema, type GmailOAuthToken } from "@ldd/core";

// Phase 10 T6: user_gmail_tokens(마이그레이션 20260723103000) CRUD. googleTokens.ts와 동형.
type GmailTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  scope: string;
  expires_at: string;
  updated_at: string;
};

function fromRow(row: GmailTokenRow): GmailOAuthToken {
  return gmailOAuthTokenSchema.parse({
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scope: row.scope,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  });
}

export type SaveGmailTokenInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresAt: string;
};

export async function saveGmailTokens(
  supabase: SupabaseClient,
  input: SaveGmailTokenInput,
): Promise<GmailOAuthToken> {
  const { data, error } = await supabase
    .from("user_gmail_tokens")
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
  return fromRow(data as GmailTokenRow);
}

// 저장된 토큰이 없으면 null(= 아직 Gmail 미연동, 에러 아님).
export async function getGmailTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<GmailOAuthToken | null> {
  const { data, error } = await supabase
    .from("user_gmail_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return fromRow(data as GmailTokenRow);
}
