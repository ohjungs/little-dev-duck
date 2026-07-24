import { NextResponse } from "next/server";

export function requireGeminiKey(): string | NextResponse {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }
  return key;
}
