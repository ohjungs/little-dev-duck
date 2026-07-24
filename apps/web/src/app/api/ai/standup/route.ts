import { NextResponse } from "next/server";
import { allowRequest, createPage, generateStandup } from "@ldd/api";
import { isLddError, userMessage } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";
import { requireGeminiKey } from "@/lib/apiHelpers";

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

    const today = new Date().toISOString().slice(0, 10);
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
