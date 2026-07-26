import {
  buildDuckLinePrompt,
  parseDuckLine,
  type DuckLineFacts,
  type DuckLineResult,
} from "@ldd/core";
import { geminiGenerate } from "./gemini";

// 2026-07-27 : 오리 - 자율 발화 - LLM 표현 (2차 피드백 1-3, Phase 45 T1)
// 규칙이 고른 사실(`factLine`)을 **다르게 말하게** 한다. 프롬프트와 판정은 전부 core에 있고
// 여기서는 Gemini를 부르기만 한다 — 신규 인프라 0(작문 보조와 같은 프록시 재사용).
//
// **실패는 전부 null이다.** 호출부는 null이면 규칙이 만든 템플릿 문장을 그대로 쓰면 되고,
// 그게 곧 지금까지의 동작이다 — 즉 **저하 모드가 기존 기능**이라 안전하다.
// 쿼터가 없다고 오리가 입을 닫으면 기능이 사라진 것처럼 보인다.
export async function generateDuckLine(
  facts: DuckLineFacts,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DuckLineResult | null> {
  if (facts.factLine.trim() === "") return null;
  try {
    const raw = await geminiGenerate(buildDuckLinePrompt(facts), apiKey, fetchImpl);
    return parseDuckLine(raw, facts.mood);
  } catch {
    // 쿼터 초과·네트워크 실패·응답 이상 — 어느 쪽이든 오리는 말을 이어가야 한다.
    return null;
  }
}
