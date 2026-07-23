import { EMBEDDING_DIM, LddError } from "@ldd/core";

// Gemini API 클라이언트(순수·키/‌fetch 주입식 — github.ts와 동일 패턴). 키는 호출측(API Route)이 서버
// env에서 주입한다. 모델명은 상수(무료 티어 기준, 변동 시 여기만 교체 — ponytail 보정 지점).
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_EMBED_MODEL = "gemini-embedding-001";
// 2026-07-22 : AI - Gemini - gemini-2.5-flash가 신규 키에 404(deprecated for new users)라 자동 최신 별칭으로 교체
export const GEMINI_GEN_MODEL = "gemini-flash-latest";

export async function safeBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

// 429 = 무료 티어 쿼터/레이트 → quota_exceeded(폴백 트리거). 그 외 실패 = upstream. googleCalendar.ts/
// githubIssues.ts도 이 헬퍼를 재사용하므로 service로 출처를 표시한다(안 넣으면 GitHub 오류가 "gemini
// 404"처럼 잘못된 출처로 보고돼 장애 대응 시 혼란을 준다, 보안 리뷰 지적 2026-07-23).
export function upstreamError(status: number, body: string, service = "gemini"): LddError {
  if (status === 429) return new LddError("quota_exceeded", `${service} 429: ${body}`);
  return new LddError("upstream", `${service} ${status}: ${body}`);
}

type BatchEmbedResponse = { embeddings?: { values: number[] }[] };

// 여러 텍스트를 한 번에 임베딩(무료 티어 요청 수 절약). 반환은 텍스트 순서대로 768차원 벡터.
export async function geminiEmbed(
  texts: string[],
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetchImpl(
    `${GEMINI_BASE}/models/${GEMINI_EMBED_MODEL}:batchEmbedContents`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIM,
        })),
      }),
    },
  );

  if (!res.ok) throw upstreamError(res.status, await safeBody(res));

  const json = (await res.json()) as BatchEmbedResponse;
  if (!json.embeddings || json.embeddings.length !== texts.length) {
    throw new LddError("upstream", "gemini embed 응답 형식 오류");
  }
  return json.embeddings.map((e) => e.values);
}

type GenerateResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

// 단일 턴 텍스트 생성(프롬프트 in → 텍스트 out). 도구/RAG 없는 단순 생성용(작문 보조 등).
// geminiEmbed와 동일한 키/fetch 주입식 — 키는 호출측(API Route)이 서버 env에서 주입한다.
export async function geminiGenerate(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(
    `${GEMINI_BASE}/models/${GEMINI_GEN_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) throw upstreamError(res.status, await safeBody(res));
  const json = (await res.json()) as GenerateResponse;
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  return text.trim();
}
