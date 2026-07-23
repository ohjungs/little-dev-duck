import { NextResponse } from "next/server";

// Phase 12 T3 헬스체크. 서버에서 각 서비스 상태를 점검해 반환한다(설정 페이지 카드가 표시).
// Gemini는 실제 호출이 무료 한도를 소진시키므로 키 구성 여부만 확인한다(핑 안 함).
export const dynamic = "force-dynamic";

async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    // GoTrue health 엔드포인트(200이면 도달 가능). 5초 타임아웃으로 카드가 오래 매달리지 않게 한다.
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = await checkSupabase();
  const gemini = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({
    supabase,
    gemini,
    checkedAt: new Date().toISOString(),
  });
}
