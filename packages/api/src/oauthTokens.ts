import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodSchema } from "zod";

// 2026-07-24 : SHOULD - 내부구조 - OAuth 토큰 모듈 공통화
// googleTokens / gmailTokens / githubTokens 세 파일이 구조 동형이라 공통 팩토리로 추출.
// 테이블·스키마·row→도메인 변환만 다르며, 나머지(upsert/maybeSingle 패턴)는 동일.

type TokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  scope: string;
  expires_at: string | null;
  updated_at: string;
};

export type SaveTokenInput = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresAt: string | null;
};

export type TokenModule<T> = {
  save(supabase: SupabaseClient, input: SaveTokenInput): Promise<T>;
  get(supabase: SupabaseClient, userId: string): Promise<T | null>;
};

// 각 토큰 파일이 테이블명·스키마·row→도메인 변환을 넘기면 save/get 구현을 돌려준다.
export function createTokenModule<T>(
  tableName: string,
  schema: ZodSchema<T>,
  fromRow: (row: TokenRow) => T,
): TokenModule<T> {
  return {
    async save(supabase, input) {
      const { data, error } = await supabase
        .from(tableName)
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
      return schema.parse(fromRow(data as TokenRow));
    },

    async get(supabase, userId) {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return schema.parse(fromRow(data as TokenRow));
    },
  };
}
