import {
  buildWriteAssistPrompt,
  WRITE_INPUT_MAX,
  type WriteAction,
} from "@ldd/core";
import { geminiGenerate } from "./gemini";

// 에디터 AI 작문 보조: core 프롬프트 빌더 + Gemini 단순 생성. 신규 인프라 0(기존 프록시 재사용).
// 입력은 상한까지 자르고(쿼터 보호), 빈 입력은 호출 없이 빈 문자열.
export async function assistWrite(
  action: WriteAction,
  text: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const prompt = buildWriteAssistPrompt(action, trimmed.slice(0, WRITE_INPUT_MAX));
  return geminiGenerate(prompt, apiKey, fetchImpl);
}
