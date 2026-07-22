import { z } from "zod";

// Phase 10 T3. Google Calendar 어댑터가 쓸 access/refresh token 보관 계약. Supabase 세션의 provider_token은
// 최초 로그인 시점에만 노출되므로(공식 문서 실측, phase_10.md) 콜백에서 즉시 이 레코드로 옮겨 담는다.
// 평문 저장이지만 RLS로 본인만 접근 가능하고 Postgres 인프라 암호화(at-rest)에 의존한다 — 개인 워크스페이스
// 단일 사용자 모델이라 컬럼 레벨 암호화는 과설계(YAGNI). 필요해지면 pgsodium/Vault로 격상.
export const googleOAuthTokenSchema = z.object({
  userId: z.string().uuid(),
  accessToken: z.string().min(1),
  // Google이 access_type=offline 없이는 refresh_token을 재발급하지 않으므로(재동의 시 최초 1회만) nullable.
  refreshToken: z.string().min(1).nullable(),
  // Google Calendar 어댑터가 요청한 scope 목록(공백 구분, OAuth 표준). 승인 범위 감사용.
  scope: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type GoogleOAuthToken = z.infer<typeof googleOAuthTokenSchema>;
