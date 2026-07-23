import { NextResponse } from "next/server";
import { allowRequest, assistWrite } from "@ldd/api";
import {
  isLddError,
  userMessage,
  WRITE_INPUT_MAX,
  writeActionSchema,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 에디터 AI 작문 보조(노션 격차 P1). 기존 Gemini 프록시 재사용 — /api/ai/agent와 동일한 서버키+auth+
// 레이트리밋 패턴. 도구/RAG 없는 단순 텍스트 변환(요약/다듬기/짧게/영어/이어쓰기)만.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!allowRequest(`ai-write:${user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const b = (body ?? {}) as { action?: unknown; text?: unknown };
  const action = writeActionSchema.safeParse(b.action);
  if (!action.success) {
    return NextResponse.json(
      { error: "지원하지 않는 작업입니다." },
      { status: 400 },
    );
  }
  const text = typeof b.text === "string" ? b.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "글을 입력해주세요." }, { status: 400 });
  }
  if (text.length > WRITE_INPUT_MAX * 2) {
    return NextResponse.json({ error: "글이 너무 깁니다." }, { status: 400 });
  }

  try {
    const result = await assistWrite(action.data, text, apiKey);
    return NextResponse.json({ result });
  } catch (e) {
    if (isLddError(e)) {
      const status = e.code === "quota_exceeded" ? 429 : 502;
      return NextResponse.json({ error: userMessage(e) }, { status });
    }
    return NextResponse.json(
      { error: "처리하기 어려워요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
