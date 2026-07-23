import { z } from "zod";

// Phase 10 T5. GitHub Issues 어댑터가 쓸 access token 보관 계약(google-oauth-token.ts와 동형).
// GitHub OAuth App의 기본 발급 토큰은 만료가 없고(refresh_token 개념도 없음) — expiresAt/refreshToken을
// nullable로 둬 "만료 없음"을 사실대로 표현한다(Google처럼 임의 값을 지어내지 않음).
export const githubOAuthTokenSchema = z.object({
  userId: z.string().uuid(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).nullable(),
  // GitHub Issues 어댑터가 요청한 scope(공백 구분). 승인 범위 감사용.
  scope: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  updatedAt: z.string().datetime({ offset: true }),
});
export type GithubOAuthToken = z.infer<typeof githubOAuthTokenSchema>;
