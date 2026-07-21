import { NextResponse } from "next/server";
import { z } from "zod";
import { indexSource, allowRequest } from "@ldd/api";
import { embeddingSourceSchema } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 저장 시 임베딩 인덱싱. 본인(user_id) 데이터만 인덱싱(RLS + 서버가 userId를 세션에서 주입).
const embedBodySchema = z.object({
  sourceType: embeddingSourceSchema,
  sourceId: z.string().min(1).max(200),
  text: z.string().max(20000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!allowRequest(`ai-embed:${user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "요청이 많습니다." }, { status: 429 });
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
    body = null;
  }
  const parsed = embedBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const indexed = await indexSource(supabase, apiKey, {
      userId: user.id,
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      text: parsed.data.text,
    });
    return NextResponse.json({ indexed });
  } catch (error) {
    console.error("AI embed 실패", { userId: user.id, error });
    return NextResponse.json({ error: "인덱싱에 실패했습니다." }, { status: 502 });
  }
}
