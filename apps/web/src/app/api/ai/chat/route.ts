import { NextResponse } from "next/server";
import { answerQuestion, allowRequest } from "@ldd/api";
import { isLddError } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LEN = 1000;

// 오리 RAG 대화. 서버 전용 GEMINI_API_KEY로 answerQuestion(임베딩→본인 데이터 검색→생성)을 프록시한다.
// AI는 로그인 본인 계정에서만(공개 데모 방문자의 쿼터 소모 차단, DECISIONS 3절).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!allowRequest(`ai-chat:${user.id}`, 20, 60_000)) {
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

  try {
    const result = await answerQuestion(supabase, apiKey, question);
    return NextResponse.json(result);
  } catch (error) {
    // 쿼터 소진은 룰 대사 폴백으로 우아하게 degrade(클라이언트가 오리 룰 대사를 붙인다).
    if (isLddError(error) && error.code === "quota_exceeded") {
      return NextResponse.json({ route: "rule", answer: null, sources: [] });
    }
    console.error("AI chat 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "지금은 답하기 어려워요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
