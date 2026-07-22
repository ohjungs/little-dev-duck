import { NextResponse } from "next/server";
import {
  allowRequest,
  createGoogleCalendarAdapter,
  getGoogleTokens,
  runAgentTurn,
} from "@ldd/api";
import { isLddError } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LEN = 1000;
const RECONNECT_MESSAGE =
  "Google Calendar가 연동되어 있지 않아요. Google 계정으로 다시 로그인하면 연동됩니다.";

// Phase 10 T2/T3: 오리 에이전트 액션. Phase 8 /chat과 동일한 서버 키+auth+레이트리밋 골격 위에, 질문을
// Google Calendar 어댑터로 runAgentTurn에 넘긴다. mutating 도구는 여기서 실행하지 않고 approval_pending을
// 그대로 클라에 반환 — 실제 실행은 /api/ai/agent/approve(사용자 승인 후)에서만 일어난다.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!allowRequest(`ai-agent:${user.id}`, 20, 60_000)) {
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

  let question: unknown;
  try {
    question = (await request.json())?.question;
  } catch {
    question = undefined;
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "질문이 필요합니다." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LEN) {
    return NextResponse.json({ error: "질문이 너무 깁니다." }, { status: 400 });
  }

  const tokens = await getGoogleTokens(supabase, user.id);
  if (!tokens) {
    return NextResponse.json({ status: "unavailable", message: RECONNECT_MESSAGE });
  }

  try {
    const adapter = createGoogleCalendarAdapter(tokens.accessToken);
    const result = await runAgentTurn(question, adapter, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    if (isLddError(error) && error.code === "quota_exceeded") {
      return NextResponse.json({
        status: "unavailable",
        message: "지금은 에이전트 액션을 사용할 수 없어요. 잠시 후 다시 시도해주세요.",
      });
    }
    // access_token 만료(~1시간, 갱신 미구현) 시 Google이 401을 주고 어댑터가 unauthorized로 표시한다.
    // 일반 502 대신 실제로 도움이 되는 재연동 안내를 준다.
    if (isLddError(error) && error.code === "unauthorized") {
      return NextResponse.json({ status: "unavailable", message: RECONNECT_MESSAGE });
    }
    console.error("AI agent 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "지금은 처리하기 어려워요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
