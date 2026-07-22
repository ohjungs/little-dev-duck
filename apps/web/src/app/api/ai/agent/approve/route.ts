import { NextResponse } from "next/server";
import { z } from "zod";
import {
  allowRequest,
  createGoogleCalendarAdapter,
  executeApprovedCalls,
  getGoogleTokens,
} from "@ldd/api";
import { toolCallSchema } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ calls: z.array(toolCallSchema).min(1).max(10) });

// Phase 10 T2: 사용자가 승인한 mutating 도구 호출을 실행한다. /api/ai/agent가 approval_pending으로
// 반환한 calls를 클라가 그대로 돌려보낸다. 카탈로그 재검증(readonly/unknown 거부)은 executeApprovedCalls가
// 담당 — 승인 UI를 우회한 임의 실행은 서버가 이중으로 막는다.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!allowRequest(`ai-agent-approve:${user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const tokens = await getGoogleTokens(supabase, user.id);
  if (!tokens) {
    return NextResponse.json(
      { error: "Google Calendar가 연동되어 있지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const adapter = createGoogleCalendarAdapter(tokens.accessToken);
    const results = await executeApprovedCalls(parsed.data.calls, adapter);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("AI agent 승인 실행 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "실행 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
