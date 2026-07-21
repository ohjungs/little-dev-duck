import type { EmbeddingSource } from "@ldd/core";

export type ReindexInput = {
  sourceType: EmbeddingSource;
  sourceId: string;
  text: string;
};

// 저장 시 임베딩 트리거: /api/ai/embed 프록시 호출(서버가 인증·키·청킹·upsert 담당). fire-and-forget —
// 인덱싱은 부가 기능이라 실패해도 사용자 저장 흐름을 막지 않는다. 다음 저장 때 재시도된다.
// ponytail: 실패 무시는 의도적(부가 기능). 재시도 큐는 RAG 품질이 문제될 때 도입.
export async function reindexSource(
  input: ReindexInput,
  options: { endpoint?: string; fetchImpl?: typeof fetch } = {},
): Promise<void> {
  const { endpoint = "/api/ai/embed", fetchImpl = fetch } = options;
  try {
    await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // 무시(부가 기능).
  }
}
