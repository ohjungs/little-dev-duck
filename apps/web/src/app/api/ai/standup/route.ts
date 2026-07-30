import { NextResponse } from "next/server";
import { allowRequest, createPage, generateStandup } from "@ldd/api";
import { isLddError, userMessage, kstDateString } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";
import { requireGeminiKey } from "@/lib/apiHelpers";
import { blockIfFeatureDisabled } from "@/lib/featureGate";

export const dynamic = "force-dynamic";

// 오리 스탠드업 노트 생성: 24시간 활동 수집 → Gemini 요약 → 페이지 자동 생성.
// 레이트리밋: 3회/시간(무료 티어 Gemini 보호 + 중복 생성 억제).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  // 2026-07-30 : 보안 - 기능토글 - 서버강제 (사용자 결정: AI 여부 기준 → duck-chat)
  // 결과물이 페이지로 생기지만 매핑은 `pages`가 아니다 — 만드는 주체가 AI라서 duck-chat이다.
  const blocked = await blockIfFeatureDisabled(supabase, user.id, "duck-chat");
  if (blocked) return blocked;
  if (!allowRequest(`ai-standup:${user.id}`, 3, 3_600_000)) {
    return NextResponse.json(
      { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  const keyOrError = requireGeminiKey();
  if (keyOrError instanceof NextResponse) return keyOrError;
  const apiKey = keyOrError;

  try {
    const result = await generateStandup(supabase, apiKey);
    if (!result) {
      return NextResponse.json(
        { error: "최근 24시간 활동이 없어요." },
        { status: 422 },
      );
    }

    // 서버는 UTC로 돈다. toISOString()을 그대로 자르면 KST 00:00~09:00 사이에 페이지 제목이
    // 어제 날짜로 붙는다(Phase 19에서 습관 체크가 밟았던 함정과 같다).
    const today = kstDateString(new Date());
    const page = await createPage(supabase, {
      title: `스탠드업 ${today}`,
      content: [
        {
          type: "paragraph",
          content: result.content,
        },
      ],
    });
    return NextResponse.json({ pageId: page.id });
  } catch (e) {
    if (isLddError(e)) {
      const status = e.code === "quota_exceeded" ? 429 : 502;
      return NextResponse.json({ error: userMessage(e) }, { status });
    }
    return NextResponse.json(
      { error: "스탠드업 생성에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
