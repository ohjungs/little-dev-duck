import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRagContext, routeUtterance } from "@ldd/core";
import { geminiEmbed } from "./gemini";
import { searchEmbeddings } from "./embeddings";
import { runAgentTurn, type Adapter, type AgentResult } from "./agent";

export type DuckTurnResult = { status: "rule" } | AgentResult;

// 발화 하나를 오리 턴으로 처리: 룰 라우팅(무료, Gemini 미호출) → RAG 검색 → 에이전트 루프.
// RAG 컨텍스트와 도구 카탈로그를 같은 systemPrompt/tools 아래 한 번에 넘기면 Gemini가 스스로 "그냥
// 답할지" "도구를 부를지" 고른다 — 대화용 엔드포인트와 액션용 엔드포인트를 분리할 필요가 없다(오리에게
// 묻기/시키기가 한 대화창에서 자연스럽게 공존). adapter.catalog가 비어 있으면(NO_TOOLS_ADAPTER) 순수
// RAG 대화로 동작한다.
export async function runDuckTurn(
  supabase: SupabaseClient,
  apiKey: string,
  question: string,
  adapter: Adapter,
  fetchImpl: typeof fetch = fetch,
  extraSystemNote?: string,
): Promise<DuckTurnResult> {
  if (routeUtterance(question) === "rule") {
    return { status: "rule" };
  }

  const [queryVector] = await geminiEmbed([question], apiKey, fetchImpl);
  const sources = await searchEmbeddings(supabase, queryVector, 5);
  const systemPrompt = [buildRagContext(sources.map((s) => s.content)), extraSystemNote]
    .filter(Boolean)
    .join("\n\n");

  return runAgentTurn(question, adapter, apiKey, fetchImpl, systemPrompt);
}
