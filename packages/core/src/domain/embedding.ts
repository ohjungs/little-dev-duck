import { z } from "zod";

// 임베딩 벡터 차원(Status.md 2026-07-21 게이트 결정). DB 컬럼 vector(768)과 반드시 일치.
export const EMBEDDING_DIM = 768;

// 임베딩 대상 소스 종류. "page"는 Phase 9 블록 에디터에서 추가(phase_08.md T0-4/T0-7 이월 해소) —
// DB source_type CHECK 제약도 마이그레이션 20260722040000_embeddings_source_page로 함께 확장했다.
// enum 확장은 계약 변경이라 병렬 구간 밖에서만.
export const embeddingSourceSchema = z.enum([
  "memo",
  "todo",
  "habit",
  "calendar_event",
  "activity",
  "page",
]);
export type EmbeddingSource = z.infer<typeof embeddingSourceSchema>;

export const embeddingChunkSchema = z.object({
  userId: z.string().uuid(),
  sourceType: embeddingSourceSchema,
  sourceId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
  content: z.string().min(1),
});
export type EmbeddingChunk = z.infer<typeof embeddingChunkSchema>;

// RAG 검색 결과 1건.
export const retrievedChunkSchema = z.object({
  sourceType: embeddingSourceSchema,
  sourceId: z.string(),
  content: z.string(),
  similarity: z.number(),
});
export type RetrievedChunk = z.infer<typeof retrievedChunkSchema>;

// 긴 텍스트를 임베딩용 청크로 분할(문자 기준, 결정론적). 무료 티어라 청크 수 최소화가 목적이므로
// 단순 슬라이딩 윈도우. maxChars 기본 1200, overlap로 경계 문맥 보존. 빈 텍스트는 빈 배열.
// ponytail: 토큰 단위 분할은 무료 티어 절약 이득 대비 과설계 — 문자 기준으로 충분.
export function chunkText(text: string, maxChars = 1200, overlap = 100): string[] {
  const clean = text.trim();
  if (clean.length === 0) return [];
  if (clean.length <= maxChars) return [clean];

  const step = Math.max(1, maxChars - overlap);
  const chunks: string[] = [];
  for (let start = 0; start < clean.length; start += step) {
    chunks.push(clean.slice(start, start + maxChars));
    if (start + maxChars >= clean.length) break;
  }
  return chunks;
}
