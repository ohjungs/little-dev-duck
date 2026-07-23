import type { SupabaseClient } from "@supabase/supabase-js";
import { githubOAuthTokenSchema, type GithubOAuthToken } from "@ldd/core";

// Phase 10 T5: user_github_tokens(마이그레이션 20260723100000) CRUD. googleTokens.ts와 동형.
type GithubTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  scope: string;
  expires_at: string | null;
  updated_at: string;
};

function fromRow(row: GithubTokenRow): GithubOAuthToken {
  return githubOAuthTokenSchema.parse({
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scope: row.scope,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  });
}

export type SaveGithubTokenInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresAt: string | null;
};

export async function saveGithubTokens(
  supabase: SupabaseClient,
  input: SaveGithubTokenInput,
): Promise<GithubOAuthToken> {
  const { data, error } = await supabase
    .from("user_github_tokens")
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
  return fromRow(data as GithubTokenRow);
}

// 저장된 토큰이 없으면 null(= 아직 GitHub 이슈 연동 안 함, 에러 아님).
export async function getGithubTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<GithubOAuthToken | null> {
  const { data, error } = await supabase
    .from("user_github_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return fromRow(data as GithubTokenRow);
}
