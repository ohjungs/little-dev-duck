import { NextResponse } from "next/server";
import {
  allowRequest,
  composeAdapters,
  createGitHubIssuesAdapter,
  createGoogleCalendarAdapter,
  getGithubTokens,
  getGoogleTokens,
  runDuckTurn,
  type Adapter,
} from "@ldd/api";
import { isLddError } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LEN = 1000;
const NO_CALENDAR_NOTE =
  "구글 캘린더 도구는 아직 연동되지 않았다. 사용자가 캘린더/일정 관련 작업을 요청하면 실행하려 들지 말고 " +
  '"설정 페이지에서 Google Calendar 연동을 하면 캘린더 일정을 시킬 수 있어요"라고 안내만 하라.';
const NO_GITHUB_NOTE =
  "GitHub 이슈 도구는 아직 연동되지 않았다. 사용자가 GitHub 이슈 생성/조회를 요청하면 실행하려 들지 말고 " +
  '"설정 페이지에서 GitHub 이슈 연동을 하면 이슈를 만들 수 있어요"라고 안내만 하라.';

// 오리 대화창(단일). Phase 8 RAG 질답과 Phase 10 에이전트 액션을 한 엔드포인트로 합쳤다 — runDuckTurn이
// 룰 라우팅 → RAG 검색 → (도구가 있으면) 에이전트 루프까지 한 번에 처리해, Gemini가 "그냥 답할지 도구를
// 부를지"를 스스로 고른다. T5: 어댑터가 둘 이상(Google Calendar + GitHub 등)이면 composeAdapters로 합쳐
// 하나의 카탈로그로 넘긴다 — 아무것도 연동 안 됐으면 composeAdapters([])가 NO_TOOLS_ADAPTER를 반환해
// 순수 RAG 대화만 동작(도구 숨김). mutating 도구는 여기서 실행하지 않고 approval_pending을 그대로 반환 —
// 실제 실행은 /api/ai/agent/approve.
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

  const [googleTokens, githubTokens] = await Promise.all([
    getGoogleTokens(supabase, user.id),
    getGithubTokens(supabase, user.id),
  ]);
  const adapters: Adapter[] = [];
  if (googleTokens) adapters.push(createGoogleCalendarAdapter(googleTokens.accessToken));
  if (githubTokens) adapters.push(createGitHubIssuesAdapter(githubTokens.accessToken));
  const adapter = composeAdapters(adapters);

  const unavailableNote = [
    googleTokens ? null : NO_CALENDAR_NOTE,
    githubTokens ? null : NO_GITHUB_NOTE,
  ]
    .filter((note): note is string => note !== null)
    .join("\n\n");

  try {
    const result = await runDuckTurn(
      supabase,
      apiKey,
      question,
      adapter,
      fetch,
      unavailableNote.length > 0 ? unavailableNote : undefined,
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
    // access_token 만료/취소 시 어댑터가 unauthorized로 표시한다(Google ~1시간 만료, GitHub 연동 해제 등).
    // 일반 502 대신 실제로 도움이 되는 재연동 안내를 준다 — 두 어댑터를 합쳤으므로 어느 쪽이 만료됐는지는
    // 어댑터가 이미 담아 던진 error.message(서비스별로 다름, googleCalendar.ts/githubIssues.ts)를 그대로 쓴다.
    if (isLddError(error) && error.code === "unauthorized") {
      return NextResponse.json({
        status: "unavailable",
        message: `${error.message}. 설정 페이지에서 다시 연동해주세요.`,
      });
    }
    console.error("AI agent 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "지금은 처리하기 어려워요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
