import { z } from "zod";

// Phase 10 T6. Gmail 어댑터가 쓸 access/refresh token 보관 계약. google-oauth-token.ts와 필드는 동형이지만
// 별도 테이블(user_gmail_tokens)에 저장한다 — Calendar와 Gmail은 둘 다 "Google" 로그인이지만 서로 다른
// scope를 별도 동의 시점에 받으므로, 하나의 user_google_tokens 행을 공유하면 나중에 연동한 쪽이 먼저
// 연동된 토큰(및 그 scope)을 덮어써 지워버린다 — 어댑터(scope 단위)별로 테이블을 분리해야 안전하다.
export const gmailOAuthTokenSchema = z.object({
  userId: z.string().uuid(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).nullable(),
  scope: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type GmailOAuthToken = z.infer<typeof gmailOAuthTokenSchema>;
