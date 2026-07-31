import { z } from "zod";

export const contributionDaySchema = z.object({
  date: z.string().date(),
  count: z.number().int().min(0),
});

export type ContributionDay = z.infer<typeof contributionDaySchema>;

export const contributionSummarySchema = z.object({
  totalCount: z.number().int().min(0),
  days: z.array(contributionDaySchema),
});

export type ContributionSummary = z.infer<typeof contributionSummarySchema>;

// 2026-07-31 : 기여API - 응답계약 - 단일출처
// GET /api/github/contributions의 200 본문. 판별자는 불리언 리터럴 `linked`이고,
// 미연동일 때 `summary`는 null이 아니라 **키 자체가 없다**.
// strict를 쓰지 않는다(기본 strip): 서버가 나중에 필드를 더해도 구 클라이언트가 죽지 않게 한다.
// 대신 linked 누락·summary 누락·타입 불일치는 전부 거부된다.
// days의 날짜 오름차순·중복 없음은 계약이지만 스키마로 강제하지 않는다(런타임 O(n) 비용 회피).
// 이 타입을 위젯/useDuckMood가 각자 재선언하지 않는다 — 재선언은 계약 이중화다.
export const contributionsResponseSchema = z.discriminatedUnion("linked", [
  z.object({ linked: z.literal(true), summary: contributionSummarySchema }),
  z.object({ linked: z.literal(false) }),
]);

export type ContributionsResponse = z.infer<typeof contributionsResponseSchema>;
