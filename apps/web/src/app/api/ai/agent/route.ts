import { NextResponse } from "next/server";
import {
  allowRequest,
  createGoogleCalendarAdapter,
  getGoogleTokens,
  runDuckTurn,
  NO_TOOLS_ADAPTER,
} from "@ldd/api";
import { isLddError } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LEN = 1000;
const RECONNECT_MESSAGE =
  "Google Calendar가 연동되어 있지 않아요. Google 계정으로 다시 로그인하면 연동됩니다.";
const NO_CALENDAR_NOTE =
  "구글 캘린더 도구는 아직 연동되지 않았다. 사용자가 캘린더/일정 관련 작업을 요청하면 실행하려 들지 말고 " +
  '"Google 계정으로 다시 로그인하면 캘린더 연동이 돼요"라고 안내만 하라.';

// 오리 대화창(단일). Phase 8 RAG 질답과 Phase 10 에이전트 액션을 한 엔드포인트로 합쳤다 — runDuckTurn이
// 룰 라우팅 → RAG 검색 → (도구가 있으면) 에이전트 루프까지 한 번에 처리해, Gemini가 "그냥 답할지 도구를
// 부를지"를 스스로 고른다. Google 미연동이면 NO_TOOLS_ADAPTER로 순수 RAG 대화만 동작(캘린더 도구 숨김).
// mutating 도구는 여기서 실행하지 않고 approval_pending을 그대로 반환 — 실제 실행은 /api/ai/agent/approve.
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
  const adapter = tokens ? createGoogleCalendarAdapter(tokens.accessToken) : NO_TOOLS_ADAPTER;

  try {
    const result = await runDuckTurn(
      supabase,
      apiKey,
      question,
      adapter,
      fetch,
      tokens ? undefined : NO_CALENDAR_NOTE,
    );
    return NextResponse.json(result);
  } catch (error) {
    // Phase 8은 쿼터 소진을 룰 대사로 조용히 degrade했지만(순수 RAG라 "모르겠다"가 자연스러웠음), 여기선
    // 액션 요청도 같은 rule 폴백을 타면서 "오리가 명령을 이해 못 함"처럼 보여 실사용 검증 중 혼란을 일으켰다
    // (2026-07-23, 실제로는 요청이 다 llm 라우팅됐는데 쿼터 소진으로 매번 캔 답변만 나감). unavailable로
    // 구분해 원인을 알 수 있게 한다.
    if (isLddError(error) && error.code === "quota_exceeded") {
      return NextResponse.json({
        status: "unavailable",
        message: "지금 요청이 많아서 잠시 답하기 어려워요. 1분 정도 후 다시 시도해주세요.",
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
