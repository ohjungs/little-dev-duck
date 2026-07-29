import { NextResponse } from "next/server";
import {
  allowRequest,
  composeAdapters,
  createAppActionsAdapter,
  createGitHubIssuesAdapter,
  createGmailAdapter,
  createGoogleCalendarAdapter,
  getGithubTokens,
  getGmailTokens,
  getGoogleTokens,
  runDuckTurn,
  type Adapter,
} from "@ldd/api";
import { historyTurnSchema, isLddError, userMessage, type HistoryTurn } from "@ldd/core";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireGeminiKey } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LEN = 1000;
// 2026-07-26 : 오리 - 미연동안내 - 되는기능까지막던문구
// 원래 문구는 "캘린더/일정 관련 작업을 요청하면 **실행하려 들지 말고** 연동 안내만 하라"였다.
// 그런데 앱 자체 캘린더 도구(addCalendarEvent·listCalendarEvents)는 연동과 무관하게 **항상 켜져 있다.**
// 즉 구글을 안 붙인 사용자(기본 상태)가 "내일 3시 회의 잡아줘"라고 하면, 되는 기능을 두고
// "연동하세요"라고 답하게 만드는 문구였다. 없는 도구만 막고 있는 도구는 쓰게 한다.
export const NO_CALENDAR_NOTE =
  "구글 캘린더 연동은 아직 되어 있지 않다. 다만 **앱 자체 캘린더 도구는 쓸 수 있으니** 일정 추가·조회 " +
  "요청은 그 도구로 처리하라. 사용자가 구글 캘린더를 콕 집어 요구할 때만 " +
  '"설정 페이지에서 Google Calendar를 연동하면 구글 일정도 다룰 수 있어요"라고 안내하라.';
const NO_GITHUB_NOTE =
  "GitHub 이슈 도구는 아직 연동되지 않았다. 사용자가 GitHub 이슈 생성/조회를 요청하면 실행하려 들지 말고 " +
  '"설정 페이지에서 GitHub 이슈 연동을 하면 이슈를 만들 수 있어요"라고 안내만 하라.';
const NO_GMAIL_NOTE =
  "Gmail 도구는 아직 연동되지 않았다. 사용자가 이메일 조회/정리를 요청하면 실행하려 들지 말고 " +
  '"설정 페이지에서 Gmail 연동을 하면 이메일을 확인할 수 있어요"라고 안내만 하라.';

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

  const keyOrError = requireGeminiKey();
  if (keyOrError instanceof NextResponse) return keyOrError;
  const apiKey = keyOrError;

  let question: unknown;
  let rawHistory: unknown;
  try {
    const body = await request.json();
    question = body?.question;
    rawHistory = body?.history;
  } catch {
    // 본문이 JSON이 아니면 아래 스키마 검증이 400으로 답한다 — 여기서 따로 알리지 않는다.
    question = undefined;
    rawHistory = undefined;
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "질문이 필요합니다." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LEN) {
    return NextResponse.json({ error: "질문이 너무 깁니다." }, { status: 400 });
  }

  // 2026-07-29 (Phase 64 T1): 직전 대화(선택). 형식이 틀리면 거부, 길이 초과는 runDuckTurn의
  // clampHistory가 절단한다(거부와 절단의 경계 — 형식은 계약, 길이는 예산).
  let history: HistoryTurn[] | undefined;
  if (rawHistory !== undefined) {
    const parsed = z.array(historyTurnSchema).max(50).safeParse(rawHistory);
    if (!parsed.success) {
      return NextResponse.json({ error: "대화 기록 형식이 올바르지 않습니다." }, { status: 400 });
    }
    history = parsed.data;
  }

  const [googleTokens, githubTokens, gmailTokens] = await Promise.all([
    getGoogleTokens(supabase, user.id),
    getGithubTokens(supabase, user.id),
    getGmailTokens(supabase, user.id),
  ]);
  const adapters: Adapter[] = [];
  // 앱 내부 액션(할일·메모 생성)은 외부 토큰이 필요 없어 항상 제공 — 오리가 늘 대화로 워크스페이스를 조작.
  adapters.push(createAppActionsAdapter(supabase, apiKey));
  if (googleTokens) adapters.push(createGoogleCalendarAdapter(googleTokens.accessToken));
  if (githubTokens) adapters.push(createGitHubIssuesAdapter(githubTokens.accessToken));
  if (gmailTokens) adapters.push(createGmailAdapter(gmailTokens.accessToken));
  const adapter = composeAdapters(adapters);

  const unavailableNote = [
    googleTokens ? null : NO_CALENDAR_NOTE,
    githubTokens ? null : NO_GITHUB_NOTE,
    gmailTokens ? null : NO_GMAIL_NOTE,
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
      history,
    );
    return NextResponse.json(result);
  } catch (error) {
    // Phase 8은 쿼터 소진을 룰 대사로 조용히 degrade했지만(순수 RAG라 "모르겠다"가 자연스러웠음), 여기선
    // 액션 요청도 같은 rule 폴백을 타면서 "오리가 명령을 이해 못 함"처럼 보여 실사용 검증 중 혼란을 일으켰다
    // (2026-07-23, 실제로는 요청이 다 llm 라우팅됐는데 쿼터 소진으로 매번 캔 답변만 나감). unavailable로
    // 구분해 원인을 알 수 있게 한다.
    if (isLddError(error) && error.code === "quota_exceeded") {
      // 문구를 여기 박아 두면 "분당 제한"과 "하루 총량 소진"이 같은 말을 하게 된다.
      // 하루가 소진됐는데 "1분 후"라고 하면 사용자는 종일 재시도한다 — core가 원문을 보고 가른다.
      return NextResponse.json({
        status: "unavailable",
        message: userMessage(error),
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
