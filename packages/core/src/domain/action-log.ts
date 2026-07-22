import { z } from "zod";

// Phase 10 T7. 실행된 mutating 도구 호출의 감사 로그 — 되돌리기 어려운 외부 액션 추적/디버깅용
// (CLAUDE.md 5절 안전 규칙). args 전체가 아니라 요약만 남긴다 — 토큰/PII가 args에 섞일 수 있어 원문
// 보관은 과도한 노출 표면(access token 자체는 args에 없지만, 방어적으로 짧은 요약만 저장).
export const actionLogEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  toolName: z.string().min(1),
  argsSummary: z.string().max(500),
  status: z.enum(["success", "error"]),
  resultSummary: z.string().max(500),
  createdAt: z.string().datetime({ offset: true }),
});
export type ActionLogEntry = z.infer<typeof actionLogEntrySchema>;

// 임의 args/response 객체를 안전한 요약 문자열로 축약. 순수함수라 테스트 대상.
export function summarizeForLog(value: Record<string, unknown>): string {
  const json = JSON.stringify(value);
  const MAX_LEN = 200;
  return json.length > MAX_LEN ? `${json.slice(0, MAX_LEN)}…` : json;
}
