import type { SupabaseClient } from "@supabase/supabase-js";
import { githubOAuthTokenSchema, type GithubOAuthToken } from "@ldd/core";
import { createTokenModule, type SaveTokenInput } from "./oauthTokens";

// Phase 10 T5: user_github_tokens(마이그레이션 20260723100000) CRUD. oauthTokens 팩토리로 위임.
// GitHub OAuth App 기본 토큰은 만료 없음 — expiresAt/refreshToken 모두 nullable.
const _module = createTokenModule(
  "user_github_tokens",
  githubOAuthTokenSchema,
  (row) => ({
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scope: row.scope,
    expiresAt: row.expires_at, // nullable — GitHub 비만료 토큰
    updatedAt: row.updated_at,
  }),
);

export type SaveGithubTokenInput = SaveTokenInput;

export async function saveGithubTokens(
  supabase: SupabaseClient,
  input: SaveGithubTokenInput,
): Promise<GithubOAuthToken> {
  return _module.save(supabase, input);
}

// 저장된 토큰이 없으면 null(= 아직 GitHub 이슈 연동 안 함, 에러 아님).
export async function getGithubTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<GithubOAuthToken | null> {
  return _module.get(supabase, userId);
}
