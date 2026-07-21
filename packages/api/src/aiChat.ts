import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRagPrompt,
  routeUtterance,
  type RetrievedChunk,
  type UtteranceRoute,
} from "@ldd/core";
import { geminiEmbed, geminiGenerate } from "./gemini";
import { searchEmbeddings } from "./embeddings";

export type AiAnswer = {
  route: UtteranceRoute;
  // rule이면 null(호출측이 Phase 6 룰 대사 사용). llm이면 생성된 답변.
  answer: string | null;
  sources: RetrievedChunk[];
};

// 질문 → 라우팅 → (llm이면) 질문 임베딩 → 본인 데이터 top-k 검색 → 프롬프트 → 생성.
// rule이면 Gemini를 호출하지 않는다(무료 쿼터 절약). 실패(쿼터 등)는 LddError로 던져 호출측이 폴백.
export async function answerQuestion(
  supabase: SupabaseClient,
  apiKey: string,
  question: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AiAnswer> {
  if (routeUtterance(question) === "rule") {
    return { route: "rule", answer: null, sources: [] };
  }

  const [queryVector] = await geminiEmbed([question], apiKey, fetchImpl);
  const sources = await searchEmbeddings(supabase, queryVector, 5);
  const prompt = buildRagPrompt(
    question,
    sources.map((s) => s.content),
  );
  const answer = await geminiGenerate(prompt, apiKey, fetchImpl);
  return { route: "llm", answer, sources };
}
