import { NextResponse } from "next/server";
import { allowRequest, generateDuckLine } from "@ldd/api";
import { DUCK_LINE_MAX_CHARS } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";
import { requireGeminiKey } from "@/lib/apiHelpers";
import { blockIfFeatureDisabled } from "@/lib/featureGate";

export const dynamic = "force-dynamic";

// 2026-07-27 : 오리 - 자율 발화 - LLM 표현 (2차 피드백 1-3, Phase 45 T1)
// 규칙이 고른 사실을 오리가 매번 다르게 말하게 한다. 인증·서버키·레이트리밋은
// `/api/ai/write`와 **같은 패턴**을 쓴다 — 새 인프라를 만들지 않는다.
//
// **상한이 이 라우트의 핵심 제약이다.** 자율 발화는 사용자가 부르지 않아도 주기적으로 일어나서,
// 대시보드를 열어 둔 채로 무료 쿼터를 태울 수 있다. 그래서 작문(분당 20)보다 훨씬 빡빡하게 잡는다.
// 넘으면 **실패가 아니라 조용한 폴백**이다 — 화면은 규칙이 만든 템플릿 문장을 그대로 쓴다.
const RATE_LIMIT_PER_HOUR = 12;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  // 2026-07-30 : 보안 - 기능토글 - 서버강제 (사용자 결정: AI 여부 기준 → duck-chat)
  // **여기만 403이 아니라 200 + null이다.** 다른 라우트와 다른 이유는 이 라우트의 기존 규약이다 —
  // 아래 상한 초과와 생성 실패가 모두 "실패가 아니라 템플릿을 써라"로 답한다. 기능이 꺼진 것도
  // 정확히 그 상황이고(템플릿 문장은 규칙이 만들므로 AI가 아니다), 이 호출은 대시보드에서 60초
  // 타이머로 반복되므로 403을 주면 콘솔·네트워크에 계속 쌓인다. **차단 자체는 동일하다** —
  // Gemini 호출에 도달하지 않는다. 이 규약은 아래 통합 테스트가 잠근다.
  if (await blockIfFeatureDisabled(supabase, user.id, "duck-chat")) {
    return NextResponse.json({ line: null });
  }
  // **공용 `allowRequest`를 쓴다.** 자체 Map으로 다시 만들면 CLAUDE.md 3-5절 최고 심각도
  // 인벤토리 위반이고, 이 저장소가 Phase 36에서 정확히 그걸로 데였다(교훈 L-16).
  if (!allowRequest(`ai-duck-line:${user.id}`, RATE_LIMIT_PER_HOUR, RATE_WINDOW_MS)) {
    // 429가 아니라 200 + null이다 — 호출부에게 이건 "실패"가 아니라 "이번엔 템플릿을 써라"다.
    return NextResponse.json({ line: null });
  }
  const keyOrError = requireGeminiKey();
  if (keyOrError instanceof NextResponse) return keyOrError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const b = (body ?? {}) as {
    factLine?: unknown;
    mood?: unknown;
    timeOfDay?: unknown;
  };
  const factLine = typeof b.factLine === "string" ? b.factLine.trim() : "";
  if (factLine === "") {
    return NextResponse.json({ error: "사실이 없습니다." }, { status: 400 });
  }
  // 사실 문장은 우리가 만든 템플릿이라 길 이유가 없다. 상한을 넘기면 프롬프트로 보내지 않는다
  // (긴 입력을 그대로 실어 보내면 쿼터를 태우고 인젝션 표면도 넓어진다).
  if (factLine.length > DUCK_LINE_MAX_CHARS * 4) {
    return NextResponse.json({ error: "사실이 너무 깁니다." }, { status: 400 });
  }

  const result = await generateDuckLine(
    {
      factLine,
      mood: typeof b.mood === "string" ? b.mood : "neutral",
      timeOfDay: typeof b.timeOfDay === "string" ? b.timeOfDay : undefined,
    },
    keyOrError,
  );
  // 생성 실패도 200 + null이다(위와 같은 이유). 오리가 침묵하면 기능이 사라진 것처럼 보인다.
  return NextResponse.json(result ? result : { line: null });
}
